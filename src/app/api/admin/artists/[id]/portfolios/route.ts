import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { getArtistPortfoliosForAdmin } from "@/lib/supabase/ad-queries";
import { UUID_RE } from "@/lib/validation";

/** GET: 관리자용 — 특정 아티스트의 포트폴리오 목록 + max (NewGrantModal 용) */
export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id: artistId } = await context.params;
    if (!UUID_RE.test(artistId)) {
        return NextResponse.json({ error: "유효하지 않은 artistId" }, { status: 400 });
    }

    try {
        const result = await getArtistPortfoliosForAdmin(auth.supabase, artistId);
        return NextResponse.json(result);
    } catch (e) {
        const message = e instanceof Error ? e.message : "알 수 없는 오류";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
