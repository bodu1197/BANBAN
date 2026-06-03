import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { cancelSubscription } from "@/lib/supabase/ad-queries";
import { refundPointsBestEffort } from "@/lib/supabase/point-queries";

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

    const { data: sub } = await supabase
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

    // PENDING → CANCELLED 원자적 claim. 동시/재시도 호출 중 1건만 성공 → 이중 환불 차단(H4).
    const claimed = await cancelSubscription(body.subscriptionId, "PENDING");
    if (!claimed) return NextResponse.json({ error: "not_pending" }, { status: 400 });

    // claim 성공한 호출만 포인트 환불 (best-effort, 실패 시 로깅)
    await refundPointsBestEffort({
        userId: user.id,
        amount: sub.paid_by_points,
        description: "광고 결제 취소 - 포인트 환불",
        context: "ads/cancel",
    });

    return NextResponse.json({ success: true });
}
