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

/** 응답 행 셰이프 — toMergedArtist 반환 / merged Map 값 / 최종 응답 변환에 공유 */
interface MergedArtist {
    id: string;
    title: string;
    profile_image_path: string | null;
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

/** profiles 검색 결과의 user_id 로 artists 추가 조회 — 회원 deleted 필터 동기화 */
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

/** 표시명 fallback (title → nickname/username → "(이름 없음)") + 결과 행 변환 */
function toMergedArtist(a: ArtistRow, profileMap: Map<string, string>): MergedArtist {
    return {
        id: a.id,
        title: a.title || profileMap.get(a.user_id) || "(이름 없음)",
        profile_image_path: a.profile_image_path,
    };
}

/** Promise.allSettled 결과에서 data 안전 추출 — 부분 실패해도 다른 쿼리 결과 사용 */
function settledData<T>(result: PromiseSettledResult<{ data: T[] | null }>): T[] {
    if (result.status === "fulfilled") return result.value.data ?? [];
    return [];
}

/** GET: 관리자용 아티스트 검색 (ad-grants 모달 자동완성).
 *  검색 컬럼: artists.title + profiles.nickname + profiles.username — 회원이 샵 미등록 / 닉네임 가입 케이스 커버.
 *  모든 쿼리에 deleted_at IS NULL — soft-delete 회원 검색 결과 제외. */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const rawLimit = searchParams.get("limit") ?? String(ARTIST_SEARCH_RESULT_LIMIT);
    const parsedLimit = Number(rawLimit) || ARTIST_SEARCH_RESULT_LIMIT;
    const limit = Math.max(1, Math.min(MAX_LIMIT, parsedLimit));

    if (q.length === 0) return NextResponse.json({ artists: [] });

    const pattern = `%${escapeLikePattern(q)}%`;

    // 3개 컬럼 병렬 검색 — Promise.allSettled 로 부분 실패해도 다른 쿼리 결과 사용
    const settled = await Promise.allSettled([
        auth.supabase
            .from("artists").select("id, title, profile_image_path, user_id")
            .ilike("title", pattern).is("deleted_at", null).limit(limit),
        auth.supabase
            .from("profiles").select("id, nickname, username")
            .ilike("nickname", pattern).is("deleted_at", null).limit(limit),
        auth.supabase
            .from("profiles").select("id, nickname, username")
            .ilike("username", pattern).is("deleted_at", null).limit(limit),
    ]);

    const byTitleData = settledData<ArtistRow>(settled[0]);
    const byNicknameData = settledData<ProfileRow>(settled[1]);
    const byUsernameData = settledData<ProfileRow>(settled[2]);

    const profileMap = buildProfileMap([...byNicknameData, ...byUsernameData]);
    const extraArtists = await fetchArtistsByUserIds(auth.supabase, [...profileMap.keys()], limit);

    // dedupe + 표시명 fallback — merged.size 가 byTitleData.length + extraArtists.length 까지 커질 수 있음
    const merged = new Map<string, MergedArtist>();
    for (const a of byTitleData) merged.set(a.id, toMergedArtist(a, profileMap));
    for (const a of extraArtists) {
        if (merged.has(a.id)) continue;
        merged.set(a.id, toMergedArtist(a, profileMap));
    }

    // 결정적 순서 보장 — title 기준 ko 로컬 정렬 (3쿼리 병렬화로 인한 비결정성 제거)
    // slice(0, limit) — dedupe 후 최대 2*limit 개 가능 → 응답 size 를 limit 으로 cap
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
