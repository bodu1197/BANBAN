import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { escapeIlike } from "@/lib/supabase/queries";

/** Fetch first thumbnail for each portfolio ID */
async function fetchThumbnails(supabase: SupabaseClient, ids: string[]): Promise<Record<string, string>> {
    if (ids.length === 0) return {};
    const { data } = await supabase
        .from("portfolio_media")
        .select("portfolio_id, storage_path")
        .in("portfolio_id", ids)
        .eq("order_index", 0);
    if (!data) return {};
    return Object.fromEntries(
        (data as { portfolio_id: string; storage_path: string }[]).map((m) => [m.portfolio_id, m.storage_path])
    );
}

/** Find artist IDs matching search by title, username, nickname, or email */
async function findArtistIds(supabase: SupabaseClient, search: string): Promise<string[]> {
    // Search artists by title
    const { data: artists } = await supabase
        .from("artists")
        .select("id, user_id")
        .ilike("title", `%${escapeIlike(search)}%`);

    // Search profiles by username, nickname, email → get their artist IDs
    const s = escapeIlike(search);
    const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .or(`username.ilike.%${s}%,nickname.ilike.%${s}%,email.ilike.%${s}%`);

    const profileIds = (profiles ?? []).map((p) => (p as { id: string }).id);
    const artistIds = new Set((artists ?? []).map((a) => (a as { id: string }).id));

    if (profileIds.length > 0) {
        const { data: profileArtists } = await supabase
            .from("artists")
            .select("id")
            .in("user_id", profileIds);
        for (const a of profileArtists ?? []) artistIds.add((a as { id: string }).id);
    }

    return [...artistIds];
}

/** Build OR filter for portfolio search including artist matches */
function buildPortfolioFilter(search: string, artistIds: string[]): string {
    const s = escapeIlike(search);
    const base = `title.ilike.%${s}%,description.ilike.%${s}%`;
    return artistIds.length > 0 ? `${base},artist_id.in.(${artistIds.join(",")})` : base;
}

const PORTFOLIO_COLUMNS = "id, title, description, price_origin, price, discount_rate, likes_count, views_count, created_at, deleted_at";

const ARTIST_TYPE_FILTERS: Record<string, string> = {
    tattoo: "type_artist.eq.TATTOO,type_artist.eq.BOTH",
    semi_permanent: "type_artist.eq.SEMI_PERMANENT,type_artist.eq.BOTH",
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function buildTabQuery(supabase: SupabaseClient, tab: string, offset: number, limit: number) {
    if (tab === "tattoo" || tab === "semi_permanent") {
        const filter = tab === "tattoo" ? ARTIST_TYPE_FILTERS.tattoo : ARTIST_TYPE_FILTERS.semi_permanent;
        return supabase
            .from("portfolios")
            .select(`${PORTFOLIO_COLUMNS}, artist:artists!inner(id, title, profile_image_path, type_artist)`, { count: "exact" })
            .is("deleted_at", null)
            .or(filter, { referencedTable: "artists" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);
    }

    // "all" tab
    return supabase
        .from("portfolios")
        .select(`${PORTFOLIO_COLUMNS}, artist:artists(id, title, profile_image_path)`, { count: "exact" })
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
}

/** GET /api/admin/portfolios — 포트폴리오 목록 (탭 필터, 검색, 페이지네이션) */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { supabase } = auth;
    const url = new URL(request.url);
    const search = url.searchParams.get("search") ?? "";
    const tab = url.searchParams.get("tab") ?? "all";
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const limit = 20;
    const offset = (page - 1) * limit;

    let query = buildTabQuery(supabase, tab, offset, limit);

    if (search) {
        const artistIds = await findArtistIds(supabase, search);
        query = query.or(buildPortfolioFilter(search, artistIds));
    }

    const { data, count, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const ids = (data ?? []).map((p: { id: string }) => p.id);
    const mediaMap = await fetchThumbnails(supabase, ids);

    const portfolios = (data ?? []).map((p: { id: string }) => ({
        ...p,
        thumbnail: mediaMap[p.id] ?? null,
    }));

    return NextResponse.json({ portfolios, total: count ?? 0, page, limit });
}

/** PATCH /api/admin/portfolios — 포트폴리오 수정 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { supabase } = auth;
    const body = await request.json() as {
        id: string;
        title?: string;
        description?: string;
        price?: number;
        price_origin?: number;
        discount_rate?: number;
    };

    if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.price !== undefined) updates.price = body.price;
    if (body.price_origin !== undefined) updates.price_origin = body.price_origin;
    if (body.discount_rate !== undefined) updates.discount_rate = body.discount_rate;

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: "no fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("portfolios")
        .update(updates)
        .eq("id", body.id)
        .select("id, title, description, price, price_origin, discount_rate")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ portfolio: data });
}

/** DELETE /api/admin/portfolios — 포트폴리오 소프트 삭제 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { supabase } = auth;
    const body = await request.json() as { id: string };
    if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { error } = await supabase
        .from("portfolios")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
