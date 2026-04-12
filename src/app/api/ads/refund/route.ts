import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { cancelSubscription } from "@/lib/supabase/ad-queries";
import { earnPoints } from "@/lib/supabase/point-queries";

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
        .from("profiles").select("is_admin").eq("id", userId).single();
    return !!(profile && (profile as { is_admin: boolean }).is_admin);
}

/** Fetch the subscription by ID */
async function fetchSubscription(subscriptionId: string): Promise<SubData | null> {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
        .from("ad_subscriptions")
        .select("id, status, imp_uid, merchant_uid, paid_by_cash, paid_by_points, artist:artists!inner(user_id)")
        .eq("id", subscriptionId)
        .single();
    return data as SubData | null;
}

/** Process the refund: cancel card (best effort), refund points, cancel subscription */
async function processRefund(sub: SubData): Promise<{ success: boolean; portoneSkipped?: boolean }> {
    // Try PortOne cancel - if it fails (already cancelled, etc.), proceed anyway
    if (sub.paid_by_cash > 0) {
        await cancelPortOnePayment(sub, "관리자 환불 처리");
    }

    if (sub.paid_by_points > 0) {
        await earnPoints({
            userId: sub.artist.user_id,
            amount: sub.paid_by_points,
            reason: "AD_REFUND",
            description: "관리자 환불 처리 - 포인트 환불",
        });
    }

    await cancelSubscription(sub.id);
    return { success: true };
}

/**
 * Admin-only: Refund an ACTIVE ad subscription.
 * - Cancels card payment via PortOne (if any)
 * - Refunds points (if any)
 * - Sets subscription status to CANCELLED
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
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
