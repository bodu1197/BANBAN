import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { cancelSubscription } from "@/lib/supabase/ad-queries";
import { earnPoints } from "@/lib/supabase/point-queries";

/**
 * Cancel a PENDING ad subscription (e.g. when user cancels the payment popup).
 * Refunds any points that were spent up front.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await request.json() as { subscriptionId: string };
    if (!body.subscriptionId) {
        return NextResponse.json({ error: "missing_subscription_id" }, { status: 400 });
    }

    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase query
    const { data: sub } = await (supabase as any)
        .from("ad_subscriptions")
        .select("id, status, paid_by_points, artist:artists!inner(user_id)")
        .eq("id", body.subscriptionId)
        .single();

    if (!sub) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const artist = sub.artist as { user_id: string };
    if (artist.user_id !== user.id) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    if (sub.status !== "PENDING") {
        return NextResponse.json({ error: "not_pending" }, { status: 400 });
    }

    // Cancel the subscription
    await cancelSubscription(body.subscriptionId);

    // Refund points if any were spent
    if (sub.paid_by_points > 0) {
        await earnPoints({
            userId: user.id,
            amount: sub.paid_by_points,
            reason: "AD_REFUND",
            description: "광고 결제 취소 - 포인트 환불",
        });
    }

    return NextResponse.json({ success: true });
}
