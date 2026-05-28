import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { getStorageUrl } from "@/lib/supabase/storage-utils";
import { escapeLikePattern } from "@/lib/supabase/query-utils";
import { ARTIST_SEARCH_RESULT_LIMIT } from "@/lib/supabase/ad-constants";

const MAX_LIMIT = 20;

/** GET: 관리자용 아티스트 검색 (ad-grants 모달의 자동완성) */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const limit = Math.max(1, Math.min(MAX_LIMIT, Number(searchParams.get("limit") ?? String(ARTIST_SEARCH_RESULT_LIMIT)) || ARTIST_SEARCH_RESULT_LIMIT));

    if (q.length === 0) {
        return NextResponse.json({ artists: [] });
    }

    const { data, error } = await auth.supabase
        .from("artists")
        .select("id, title, profile_image_path")
        // ILIKE wildcard escape — 사용자가 입력한 % _ \ 가 catch-all 로 동작하는 것 차단
        .ilike("title", `%${escapeLikePattern(q)}%`)
        .order("title", { ascending: true })
        .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const artists = (data ?? []).map((a) => ({
        id: a.id,
        title: a.title,
        profile_image_path: getStorageUrl(a.profile_image_path),
    }));

    return NextResponse.json({ artists });
}
