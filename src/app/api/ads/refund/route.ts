import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { cancelSubscription } from "@/lib/supabase/ad-queries";
import { refundPointsBestEffort } from "@/lib/supabase/point-queries";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const IMP_KEY = process.env.PORTONE_IMP_KEY ?? "";
const IMP_SECRET = process.env.PORTONE_IMP_SECRET ?? "";

type SubData = {
    id: string;
    status: string;
    imp_uid: string | null;
    merchant_uid: string | null;
    paid_by_cash: number;
    paid_by_points: number;
    artist: { user_id: string };
};

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

/** Cancel payment via PortOne V1 API (best effort) */
async function cancelPortOnePayment(sub: SubData, reason: string): Promise<void> {
    const token = await getV1Token();
    if (!token) return;

    const body: Record<string, string> = { reason };
    if (sub.imp_uid) body.imp_uid = sub.imp_uid;
    else if (sub.merchant_uid) body.merchant_uid = sub.merchant_uid;
    else return;

    await fetch("https://api.iamport.kr/payments/cancel", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

/** Verify the requesting user is an admin */
async function verifyAdmin(userId: string): Promise<boolean> {
    const supabase = await createClient();
    const { data: profile } = await supabase
        .from("profiles").select("is_admin").eq("id", userId).single();
    return !!(profile && (profile as { is_admin: boolean }).is_admin);
}

/** Fetch the subscription by ID */
async function fetchSubscription(subscriptionId: string): Promise<SubData | null> {
    const supabase = await createClient();
    const { data } = await supabase
        .from("ad_subscriptions")
        .select("id, status, imp_uid, merchant_uid, paid_by_cash, paid_by_points, artist:artists!inner(user_id)")
        .eq("id", subscriptionId)
        .single();
    return data as SubData | null;
}

/** Process the refund: 원자적 취소 claim → 성공 시에만 카드 취소(best effort) + 포인트 환불 (이중 환불 방지) */
async function processRefund(sub: SubData): Promise<{ success: boolean; alreadyProcessed?: boolean }> {
    // ACTIVE → CANCELLED 원자적 claim. 동시/재시도 호출 중 1건만 true → 이중 환불 차단(H4).
    const claimed = await cancelSubscription(sub.id, "ACTIVE");
    if (!claimed) return { success: true, alreadyProcessed: true };

    // claim 성공한 호출만 환불 수행
    if (sub.paid_by_cash > 0) {
        await cancelPortOnePayment(sub, "관리자 환불 처리");
    }
    await refundPointsBestEffort({
        userId: sub.artist.user_id,
        amount: sub.paid_by_points,
        description: "관리자 환불 처리 - 포인트 환불",
        context: "ads/refund",
    });
    return { success: true };
}

/**
 * Admin-only: Refund an ACTIVE ad subscription. 멱등(idempotent).
 * 1) ACTIVE → CANCELLED 를 원자적으로 claim (동시/재시도 중 1건만 성공)
 * 2) claim 에 성공한 호출만 카드 취소(PortOne, best effort) + 포인트 환불 수행
 * 이미 처리된(claim 실패) 호출은 환불을 반복하지 않고 success 로 응답.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    const ip = getClientIp(request);
    const { success: rateLimitOk } = rateLimit({ key: `refund:${ip}`, limit: 5, windowMs: 60_000 });
    if (!rateLimitOk) return rateLimitResponse();

    const user = await getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (!(await verifyAdmin(user.id))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const body = await request.json() as { subscriptionId: string };
    if (!body.subscriptionId) return NextResponse.json({ error: "missing_subscription_id" }, { status: 400 });

    const sub = await fetchSubscription(body.subscriptionId);
    if (!sub) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (sub.status !== "ACTIVE") return NextResponse.json({ error: "not_active" }, { status: 400 });

    await processRefund(sub);

    return NextResponse.json({ success: true });
}
