import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { getStorageUrl } from "@/lib/supabase/storage-utils";
import { escapeLikePattern } from "@/lib/supabase/query-utils";
import { ARTIST_SEARCH_RESULT_LIMIT } from "@/lib/supabase/ad-constants";
import type { Database } from "@/types/database";

const MAX_LIMIT = 20;

interface ArtistRow {
    id: string;
    title: string;
    profile_image_path: string | null;
    user_id: string;
}

interface ProfileRow {
    id: string;
    nickname: string | null;
    username: string | null;
}

/** profile 의 표시명 우선순위 — nickname > username */
function profileDisplayName(p: ProfileRow): string {
    return p.nickname ?? p.username ?? "";
}

/** profile 검색 결과의 user_id → 표시명 매핑 */
function buildProfileMap(profiles: ProfileRow[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const p of profiles) {
        const name = profileDisplayName(p);
        if (name) map.set(p.id, name);
    }
    return map;
}

/** profiles 검색 결과의 user_id 로 artists 추가 조회 (title 이 비거나 다른 컬럼에 매칭된 경우 커버) */
async function fetchArtistsByUserIds(
    client: SupabaseClient<Database>, userIds: string[], limit: number,
): Promise<ArtistRow[]> {
    if (userIds.length === 0) return [];
    const { data } = await client
        .from("artists")
        .select("id, title, profile_image_path, user_id")
        .in("user_id", userIds)
        .is("deleted_at", null)
        .limit(limit);
    return (data ?? []) as ArtistRow[];
}

/** GET: 관리자용 아티스트 검색 (ad-grants 모달 자동완성).
 *  검색 컬럼: artists.title + profiles.nickname + profiles.username — 회원이 샵 미등록 / 닉네임 가입 케이스 커버. */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const limit = Math.max(1, Math.min(MAX_LIMIT, Number(searchParams.get("limit") ?? String(ARTIST_SEARCH_RESULT_LIMIT)) || ARTIST_SEARCH_RESULT_LIMIT));

    if (q.length === 0) return NextResponse.json({ artists: [] });

    const pattern = `%${escapeLikePattern(q)}%`;

    // 3개 컬럼 병렬 검색 — .or() 의 문자열 보간 우회 (PostgREST escape character 충돌 회피)
    const [byTitleRes, byNicknameRes, byUsernameRes] = await Promise.all([
        auth.supabase
            .from("artists").select("id, title, profile_image_path, user_id")
            .ilike("title", pattern).is("deleted_at", null).limit(limit),
        auth.supabase
            .from("profiles").select("id, nickname, username")
            .ilike("nickname", pattern).limit(limit),
        auth.supabase
            .from("profiles").select("id, nickname, username")
            .ilike("username", pattern).limit(limit),
    ]);

    const profileMap = buildProfileMap([
        ...((byNicknameRes.data ?? []) as ProfileRow[]),
        ...((byUsernameRes.data ?? []) as ProfileRow[]),
    ]);

    const extraArtists = await fetchArtistsByUserIds(auth.supabase, [...profileMap.keys()], limit);

    // dedupe + 표시명 fallback (title → nickname → username)
    const merged = new Map<string, { id: string; title: string; profile_image_path: string | null }>();
    for (const a of (byTitleRes.data ?? []) as ArtistRow[]) {
        merged.set(a.id, {
            id: a.id,
            title: a.title || profileMap.get(a.user_id) || "(이름 없음)",
            profile_image_path: a.profile_image_path,
        });
    }
    for (const a of extraArtists) {
        if (merged.has(a.id)) continue;
        merged.set(a.id, {
            id: a.id,
            title: a.title || profileMap.get(a.user_id) || "(이름 없음)",
            profile_image_path: a.profile_image_path,
        });
    }

    // 결정적 순서 보장 — title 기준 ko 로컬 정렬 (3쿼리 병렬화로 인한 비결정성 제거)
    const artists = [...merged.values()]
        .sort((a, b) => a.title.localeCompare(b.title, "ko"))
        .slice(0, limit)
        .map((a) => ({
            id: a.id,
            title: a.title,
            profile_image_path: getStorageUrl(a.profile_image_path),
        }));

    return NextResponse.json({ artists });
}
