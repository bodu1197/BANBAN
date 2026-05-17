import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { escapeIlike } from "@/lib/supabase/queries";

// ─── Types ───────────────────────────────────────────────

interface MemberPatchBody {
    id: string;
    nickname?: string;
    email?: string;
    contact?: string;
    is_admin?: boolean;
    language?: string;
    password?: string;
}

interface QueryParams {
    search: string;
    tab: string;
    page: number;
    limit: number;
    sort: string;
}

// ─── Helpers ─────────────────────────────────────────────

const PROFILE_COLUMNS = "id, username, email, nickname, contact, is_admin, type_social, language, last_login_at, created_at, deleted_at";

function parseQueryParams(url: URL): QueryParams {
    return {
        search: url.searchParams.get("search") ?? "",
        tab: url.searchParams.get("tab") ?? "all",
        page: Math.max(1, Number(url.searchParams.get("page") ?? "1")),
        limit: 20,
        sort: url.searchParams.get("sort") ?? "",
    };
}

function parseSortColumn(sort: string): { column: string; ascending: boolean } {
    if (sort === "last_login_at_asc") return { column: "last_login_at", ascending: true };
    if (sort === "last_login_at_desc") return { column: "last_login_at", ascending: false };
    return { column: "created_at", ascending: false };
}

async function fetchLoginStats(supabase: SupabaseClient): Promise<Record<string, number>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types
    const { data } = await (supabase as any).rpc("get_login_stats");
    return (data ?? { artist_login_count: 0, general_login_count: 0, total_count: 0 }) as Record<string, number>;
}

/** Find artist user_ids matching a search term by title (활동명) */
async function findArtistUserIds(supabase: SupabaseClient, search: string): Promise<string[]> {
    const { data: artists } = await supabase
        .from("artists")
        .select("user_id")
        .ilike("title", `%${escapeIlike(search)}%`);
    return (artists ?? []).map((a) => (a as { user_id: string }).user_id);
}

/** Build OR filter including artist title matches */
function buildSearchFilter(search: string, artistUserIds: string[]): string {
    const s = escapeIlike(search);
    const base = `username.ilike.%${s}%,nickname.ilike.%${s}%,email.ilike.%${s}%`;
    return artistUserIds.length > 0 ? `${base},id.in.(${artistUserIds.join(",")})` : base;
}

const NICKNAME_REGEX = /^[가-힣A-Za-z0-9_]{2,12}$/;

function validateNickname(nickname: string | undefined): string | null {
    if (nickname === undefined) return null;
    return NICKNAME_REGEX.test(nickname) ? null : "닉네임은 한글, 영문, 숫자, 밑줄만 사용 가능 (2-12자)";
}

function buildMemberUpdates(body: MemberPatchBody): Record<string, unknown> {
    const updates: Record<string, unknown> = {};
    if (body.nickname !== undefined) updates.nickname = body.nickname;
    if (body.email !== undefined) updates.email = body.email;
    if (body.contact !== undefined) updates.contact = body.contact;
    if (body.is_admin !== undefined) updates.is_admin = body.is_admin;
    if (body.language !== undefined) updates.language = body.language;
    return updates;
}

async function handlePasswordChange(supabase: SupabaseClient, userId: string, password: string): Promise<{ error?: string }> {
    const hashed = await bcrypt.hash(password, 10);
    const { error: dbError } = await supabase.from("profiles").update({ password: hashed }).eq("id", userId);
    if (dbError) return { error: `DB: ${dbError.message}` };
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, { password });
    if (authError && !authError.message.includes("not found")) {
        return { error: `Auth: ${authError.message}` };
    }
    return {};
}

// ─── Tab Query Builders ──────────────────────────────────

const ARTIST_TYPE_FILTERS: Record<string, string> = {
    semi_permanent: "type_artist.eq.SEMI_PERMANENT",
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function buildTabQuery(supabase: SupabaseClient, tab: string, offset: number, limit: number, sort: { column: string; ascending: boolean }) {
    if (tab === "semi_permanent") {
        const filter = ARTIST_TYPE_FILTERS.semi_permanent;
        return supabase
            .from("profiles")
            .select(`${PROFILE_COLUMNS}, artists!inner(id, type_artist)`, { count: "exact" })
            .is("deleted_at", null)
            .eq("is_admin", false)
            .or(filter, { referencedTable: "artists" })
            .order(sort.column, { ascending: sort.ascending })
            .range(offset, offset + limit - 1);
    }

    if (tab === "admin") {
        return supabase
            .from("profiles")
            .select(`${PROFILE_COLUMNS}, artists!left(id, type_artist)`, { count: "exact" })
            .is("deleted_at", null)
            .eq("is_admin", true)
            .order(sort.column, { ascending: sort.ascending })
            .range(offset, offset + limit - 1);
    }

    // "all" tab
    return supabase
        .from("profiles")
        .select(`${PROFILE_COLUMNS}, artists!left(id, type_artist)`, { count: "exact" })
        .is("deleted_at", null)
        .order(sort.column, { ascending: sort.ascending })
        .range(offset, offset + limit - 1);
}

interface ArtistRow { id?: string; type_artist?: string }

function extractArtistInfo(artists: ArtistRow[] | null): { type_artist: string | null; artist_id: string | null } {
    const first = (artists ?? [])[0];
    return { type_artist: first?.type_artist ?? null, artist_id: first?.id ?? null };
}

// ─── Route Handlers ──────────────────────────────────────

/** Handle "general" tab via RPC (NOT EXISTS cannot be expressed in PostgREST) */
async function fetchGeneralMembers(
    supabase: SupabaseClient, search: string, offset: number, limit: number
): Promise<NextResponse> {
    const { data, error } = await supabase.rpc("get_general_members", {
        p_search: search,
        p_offset: offset,
        p_limit: limit,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data ?? []) as (Record<string, unknown> & { total_count: number })[];
    const total = rows[0]?.total_count ?? 0;
    const members = rows.map(({ total_count: _, ...profile }) => ({ ...profile, type_artist: null }));

    return NextResponse.json({ members, total, page: Math.floor(offset / limit) + 1, limit });
}

/** Handle standard tabs via PostgREST query builder */
async function fetchStandardMembers(
    supabase: SupabaseClient, tab: string, search: string, offset: number, limit: number, page: number, sort: { column: string; ascending: boolean }
): Promise<NextResponse> {
    let query = buildTabQuery(supabase, tab, offset, limit, sort);

    if (search) {
        const artistUserIds = await findArtistUserIds(supabase, search);
        query = query.or(buildSearchFilter(search, artistUserIds));
    }

    const [queryResult, stats] = await Promise.all([query, fetchLoginStats(supabase)]);
    const { data, count, error } = queryResult;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const members = (data ?? []).map((row) => {
        const { artists, ...profile } = row as Record<string, unknown> & { artists?: ArtistRow[] };
        const { type_artist, artist_id } = extractArtistInfo(artists ?? null);
        return { ...profile, type_artist, artist_id };
    });

    return NextResponse.json({ members, total: count ?? 0, page, limit, loginStats: stats });
}

/** GET /api/admin/members — 회원 목록 (탭 필터, 검색, 페이지네이션) */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { supabase } = auth;
    const { search, tab, page, limit, sort } = parseQueryParams(new URL(request.url));
    const offset = (page - 1) * limit;
    const sortParsed = parseSortColumn(sort);

    if (tab === "general") {
        return fetchGeneralMembers(supabase, search, offset, limit);
    }

    return fetchStandardMembers(supabase, tab, search, offset, limit, page, sortParsed);
}

/** PATCH /api/admin/members — 회원 정보 수정 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { supabase } = auth;
    const body = await request.json() as MemberPatchBody;
    if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    if (body.password) {
        const pwResult = await handlePasswordChange(supabase, body.id, body.password);
        if (pwResult.error) return NextResponse.json({ error: pwResult.error }, { status: 500 });
    }

    const nicknameError = validateNickname(body.nickname);
    if (nicknameError) return NextResponse.json({ error: nicknameError }, { status: 400 });

    const updates = buildMemberUpdates(body);
    if (Object.keys(updates).length === 0 && !body.password) {
        return NextResponse.json({ error: "no fields to update" }, { status: 400 });
    }
    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ success: true });
    }

    const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", body.id)
        .select("id, username, email, nickname, contact, is_admin, type_social, language")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ member: data });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** DELETE /api/admin/members — 회원 영구 삭제 (profiles row + auth.users + 의존 데이터 CASCADE)
 *  주의: 되돌릴 수 없음. CASCADE 정책에 따라 artists/portfolios/conversations/messages/points 등 일괄 삭제.
 *  안전장치: UUID 형식 검증, 본인 삭제 방지, 다른 admin 삭제 방지 (권한 인플레이션 방어).
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { supabase } = auth;
    const body = await request.json() as { id: string };
    if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    if (!UUID_REGEX.test(body.id)) {
        return NextResponse.json({ error: "유효한 UUID 형식이 아닙니다." }, { status: 400 });
    }

    // 자기 자신 삭제 방지 — admin 본인 계정이 사라지면 관리 권한 손실
    if (body.id === auth.userId) {
        return NextResponse.json({ error: "본인 계정은 삭제할 수 없습니다." }, { status: 400 });
    }

    // 다른 admin 삭제 방지 — 권한 있는 계정을 다른 admin 이 임의 제거하는 사고/공격 차단.
    // 정말로 필요하면 먼저 PATCH 로 is_admin=false 로 강등한 뒤 삭제하도록 절차 분리.
    const { data: target } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", body.id)
        .single();
    if ((target as { is_admin: boolean } | null)?.is_admin) {
        return NextResponse.json(
            { error: "다른 관리자 계정은 삭제할 수 없습니다. 먼저 관리자 권한을 해제하세요." },
            { status: 400 },
        );
    }

    // Hard delete: profiles row 삭제 → CASCADE 정책이 의존 데이터 일괄 정리
    const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", body.id);

    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

    // auth.users 도 함께 삭제 (socialless 사용자는 auth row 없을 수 있음 — silent)
    await supabase.auth.admin.deleteUser(body.id).catch(() => {/* auth row 부재 가능 */});

    return NextResponse.json({ success: true });
}
