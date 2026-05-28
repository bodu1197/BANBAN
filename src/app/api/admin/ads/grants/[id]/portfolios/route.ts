import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { getArtistPortfoliosForAdmin } from "@/lib/supabase/ad-queries";
import { UUID_RE } from "@/lib/validation";

/** GET: 특정 구독의 회원 포트폴리오 목록 + 현재 슬롯 + max */
export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id: subscriptionId } = await context.params;
    if (!UUID_RE.test(subscriptionId)) {
        return NextResponse.json({ error: "유효하지 않은 subscriptionId" }, { status: 400 });
    }

    const { data: sub } = await auth.supabase
        .from("ad_subscriptions")
        .select("artist_id")
        .eq("id", subscriptionId)
        .single();
    if (!sub) return NextResponse.json({ error: "구독을 찾을 수 없습니다" }, { status: 404 });

    try {
        const result = await getArtistPortfoliosForAdmin(auth.supabase, sub.artist_id, subscriptionId);
        return NextResponse.json(result);
    } catch (e) {
        const message = e instanceof Error ? e.message : "알 수 없는 오류";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
