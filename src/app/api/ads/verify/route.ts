import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { activateSubscription } from "@/lib/supabase/ad-queries";

const IMP_KEY = process.env.PORTONE_IMP_KEY ?? "";
const IMP_SECRET = process.env.PORTONE_IMP_SECRET ?? "";

interface V1Payment {
    status: string;
    amount: number;
}

/** Get PortOne V1 access token */
async function getV1Token(): Promise<string | null> {
    if (!IMP_KEY || !IMP_SECRET) return null;
    const res = await fetch("https://api.iamport.kr/users/getToken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imp_key: IMP_KEY, imp_secret: IMP_SECRET }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { response?: { access_token?: string } };
    return data.response?.access_token ?? null;
}

/** Verify payment via PortOne V1 API */
async function verifyPayment(impUid: string): Promise<V1Payment | null> {
    const token = await getV1Token();
    if (!token) return null;

    const res = await fetch(`https://api.iamport.kr/payments/${encodeURIComponent(impUid)}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;

    const data = await res.json() as { response?: { status: string; amount: number } };
    return data.response ?? null;
}

const IMP_UID_REGEX = /^[a-zA-Z0-9_-]+$/;

export async function POST(request: NextRequest): Promise<NextResponse> {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await request.json() as { impUid: string; subscriptionId: string; expectedAmount: number };
    const { impUid, subscriptionId, expectedAmount } = body;

    if (!impUid || !subscriptionId) {
        return NextResponse.json({ error: "missing_params" }, { status: 400 });
    }
    if (!IMP_UID_REGEX.test(impUid)) {
        return NextResponse.json({ error: "invalid_imp_uid" }, { status: 400 });
    }
    if (typeof expectedAmount !== "number" || expectedAmount < 0 || !Number.isFinite(expectedAmount)) {
        return NextResponse.json({ error: "invalid_expected_amount" }, { status: 400 });
    }

    // 소유권 검증 — 임의 subscriptionId 로 다른 사용자 결제 활성화 차단 (CRITICAL).
    // subscription.artist_id → artist.user_id 가 현재 user.id 와 일치해야 함.
    // PostgREST 가 artists!inner 관계를 1:1 인식 시 object, 1:N 인식 시 array 로 반환 — 둘 다 안전 처리.
    const supabase = await createClient();
    const { data: sub } = await supabase
        .from("ad_subscriptions")
        .select("id, artist:artists!inner(user_id)")
        .eq("id", subscriptionId)
        .maybeSingle();
    if (!sub) {
        return NextResponse.json({ error: "subscription_not_found" }, { status: 404 });
    }
    const artist = (sub as unknown as { artist: { user_id: string } | { user_id: string }[] | null }).artist;
    const subOwnerId = Array.isArray(artist) ? artist[0]?.user_id : artist?.user_id;
    if (subOwnerId !== user.id) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const payment = await verifyPayment(impUid);

    if (!payment) {
        return NextResponse.json({ error: "payment_verification_failed" }, { status: 400 });
    }
    if (payment.status !== "paid") {
        return NextResponse.json({ error: "payment_not_paid" }, { status: 400 });
    }
    if (payment.amount !== expectedAmount) {
        return NextResponse.json({ error: "amount_mismatch" }, { status: 400 });
    }

    const subscription = await activateSubscription(subscriptionId, impUid);
    return NextResponse.json({ success: true, subscription });
}
