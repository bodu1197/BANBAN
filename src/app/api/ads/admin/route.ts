import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { getAdRevenueStats } from "@/lib/supabase/ad-queries";
import { escapeIlike } from "@/lib/supabase/queries";

const PAGE_SIZE = 20;

type SubRow = { status: string; paid_by_cash: number; paid_by_points: number; price_paid: number };

function computePaymentBreakdown(subs: SubRow[]): { totalCash: number; totalPoints: number; activeCash: number; activePoints: number } {
    const paidSubs = subs.filter(s => s.status === "ACTIVE" || s.status === "EXPIRED");
    const activeSubs = subs.filter(s => s.status === "ACTIVE");
    return {
        totalCash: paidSubs.reduce((s, sub) => s + (sub.paid_by_cash ?? 0), 0),
        totalPoints: paidSubs.reduce((s, sub) => s + (sub.paid_by_points ?? 0), 0),
        activeCash: activeSubs.reduce((s, sub) => s + (sub.paid_by_cash ?? 0), 0),
        activePoints: activeSubs.reduce((s, sub) => s + (sub.paid_by_points ?? 0), 0),
    };
}

type ArtistTypeFilter = "SEMI_PERMANENT" | undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase query builder
function applyFilters(query: any, status: string | null, search: string | null): any {
    let q = query;
    if (status) q = q.eq("status", status);
    if (search) q = q.ilike("artist.title", `%${escapeIlike(search)}%`);
    return q;
}

function parseArtistType(param: string | null): ArtistTypeFilter {
    return param === "SEMI_PERMANENT" ? param : undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-function-return-type -- supabase query builder
function buildQueries(sb: any, params: { page: number; status: string | null; search: string | null; artistType: ArtistTypeFilter }) {
    const { page, status, search, artistType } = params;
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let pagedQuery = applyFilters(
        sb.from("ad_subscriptions").select("*, artist:artists!inner(title, profile_image_path), plan:ad_plans!inner(name, price, artist_type)", { count: "exact" }),
        status, search,
    );
    if (artistType) pagedQuery = pagedQuery.eq("plan.artist_type", artistType);
    pagedQuery = pagedQuery.order("created_at", { ascending: false }).range(from, to);

    let plansQuery = sb.from("ad_plans").select("*").eq("is_active", true);
    if (artistType) plansQuery = plansQuery.eq("artist_type", artistType);
    plansQuery = plansQuery.order("price", { ascending: true });

    let allSubsQuery = sb.from("ad_subscriptions").select("status, paid_by_cash, paid_by_points, price_paid, plan:ad_plans!inner(artist_type)");
    if (artistType) allSubsQuery = allSubsQuery.eq("plan.artist_type", artistType);

    return { pagedQuery, plansQuery, allSubsQuery };
}

async function verifyAdmin(userId: string): Promise<boolean> {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
        .from("profiles").select("is_admin").eq("id", userId).single();
    return !!(profile && (profile as { is_admin: boolean }).is_admin);
}

/** Admin-only endpoint for ad management stats (paginated) */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (!await verifyAdmin(user.id)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const artistType = parseArtistType(url.searchParams.get("artistType"));

    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { pagedQuery, plansQuery, allSubsQuery } = buildQueries(supabase as any, {
        page, status: url.searchParams.get("status"), search: url.searchParams.get("search"), artistType,
    });

    const [stats, plansResult, allSubsResult, pagedResult] = await Promise.all([
        getAdRevenueStats(artistType),
        plansQuery,
        allSubsQuery,
        pagedQuery,
    ]);

    const paymentBreakdown = computePaymentBreakdown((allSubsResult.data ?? []) as SubRow[]);
    const totalCount = pagedResult.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    return NextResponse.json({
        stats,
        subscriptions: pagedResult.data ?? [],
        plans: plansResult.data ?? [],
        paymentBreakdown,
        pagination: { page, pageSize: PAGE_SIZE, totalCount, totalPages },
    });
}
