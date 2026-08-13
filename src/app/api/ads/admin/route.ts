import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { createAdminClient } from "@/lib/supabase/server";
import { escapeIlike } from "@/lib/supabase/queries";
import { adStatusFilterExpr, isAdStatus } from "@/lib/ad-status";
import type { AdSubscriptionStatus } from "@/types/ads";
import { computeAdminAdStats, AD_STATS_COLUMNS, type AdStatsRow } from "@/lib/ad-stats";

const PAGE_SIZE = 20;

type ArtistTypeFilter = "SEMI_PERMANENT" | undefined;

type SupabaseInstance = ReturnType<typeof createAdminClient>;
type QBuilder = ReturnType<SupabaseInstance["from"]>;

function applyFilters(query: QBuilder, status: AdSubscriptionStatus | null, search: string | null): QBuilder {
    let q = query;
    // 상태 필터는 만료일까지 함께 본다(규칙은 lib/ad-status.ts 한 곳) — status 컬럼만 걸면 만료 크론
    // 실행 전 만료건이 "활성" 에 섞이고 "만료" 필터에서는 빠진다(화면 배지·통계와 불일치).
    if (status) q = q.or(adStatusFilterExpr(status, Date.now()));
    if (search) q = q.ilike("artist.title", `%${escapeIlike(search)}%`);
    return q;
}

function parseArtistType(param: string | null): ArtistTypeFilter {
    return param === "SEMI_PERMANENT" ? param : undefined;
}

function buildQueries(sb: SupabaseInstance, params: { page: number; status: AdSubscriptionStatus | null; search: string | null; artistType: ArtistTypeFilter }): { pagedQuery: QBuilder; plansQuery: QBuilder; allSubsQuery: QBuilder } {
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

    // count:"exact" — PostgREST max_rows 로 잘려도 에러가 안 나므로, 전체 건수와 대조해 잘림을 감지한다
    let allSubsQuery = sb.from("ad_subscriptions")
        .select(`${AD_STATS_COLUMNS}, plan:ad_plans!inner(artist_type)`, { count: "exact" });
    if (artistType) allSubsQuery = allSubsQuery.eq("plan.artist_type", artistType);

    return { pagedQuery, plansQuery, allSubsQuery };
}

/** ?page=abc 는 NaN → .range(NaN) → PostgREST 에러(500)가 된다 → 1 로 폴백 */
function parsePage(raw: string | null): number {
    const n = Number(raw ?? "1");
    return Number.isFinite(n) ? Math.max(1, Math.trunc(n)) : 1;
}

/** 쿼리파라미터 파싱 + status 화이트리스트 검증 (에러면 NextResponse) */
function parseListQuery(request: NextRequest):
    { error: NextResponse } | { page: number; status: AdSubscriptionStatus | null; search: string | null; artistType: ArtistTypeFilter } {
    const url = new URL(request.url);
    const raw = url.searchParams.get("status");
    // 모르는 status 를 무시하면 필터가 통째로 사라져 전체 목록이 나간다 → 부여 목록 API 와 같이 400.
    // 검증을 통과한 값만 타입이 좁혀진 채 아래로 흐르므로 필터 적용부에서 재검사할 필요가 없다.
    let status: AdSubscriptionStatus | null = null;
    if (raw !== null) {
        if (!isAdStatus(raw)) {
            return { error: NextResponse.json({ error: "유효하지 않은 status" }, { status: 400 }) };
        }
        status = raw;
    }
    return {
        page: parsePage(url.searchParams.get("page")),
        status,
        search: url.searchParams.get("search"),
        artistType: parseArtistType(url.searchParams.get("artistType")),
    };
}

/**
 * 쿼리 실패·잘림 검사. 둘 다 조용히 넘기면 "매출 0원" 이라는 거짓말이 200 으로 나간다.
 * 원문 에러 메시지는 컬럼·제약명을 노출하므로 로그에만 남기고 응답은 고정 문구.
 */
function checkResults(r: {
    allSubsResult: { data: unknown[] | null; count: number | null; error: { message: string } | null };
    pagedResult: { error: { message: string } | null };
    plansResult: { error: { message: string } | null };
}): NextResponse | null {
    const failure = r.allSubsResult.error ?? r.pagedResult.error ?? r.plansResult.error;
    if (failure) {
        // eslint-disable-next-line no-console -- error logging
        console.error("[api/ads/admin] query failed:", failure.message);
        return NextResponse.json({ error: "광고 데이터를 불러오지 못했습니다" }, { status: 500 });
    }
    // PostgREST max_rows 로 잘려도 에러가 안 난다 → 잘린 목록으로 집계하면 매출이 조용히 축소된다
    const rows = r.allSubsResult.data ?? [];
    if ((r.allSubsResult.count ?? rows.length) > rows.length) {
        // eslint-disable-next-line no-console -- error logging
        console.error(`[api/ads/admin] 집계 대상이 잘렸다: ${rows.length}/${r.allSubsResult.count}`);
        return NextResponse.json({ error: "구독 수가 많아 집계할 수 없습니다" }, { status: 500 });
    }
    return null;
}

/** Admin-only endpoint for ad management stats (paginated) */
export async function GET(request: NextRequest): Promise<NextResponse> {
    // 중앙 requireAdmin(#29) — 인증(getUser+is_admin)은 createClient(본인 프로필 RLS 허용),
    // 반환되는 auth.supabase 는 service_role(RLS 우회). ad_subscriptions SELECT RLS 가 소유자
    // 제한이라 관리자 전체 조회(목록·결제집계·매출)에는 service_role 이 필수.
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const parsed = parseListQuery(request);
    if ("error" in parsed) return parsed.error;
    const { page } = parsed;

    const { pagedQuery, plansQuery, allSubsQuery } = buildQueries(auth.supabase, parsed);

    const [plansResult, allSubsResult, pagedResult] = await Promise.all([
        plansQuery,
        allSubsQuery,
        pagedQuery,
    ]);

    const failure = checkResults({ allSubsResult, pagedResult, plansResult });
    if (failure) return failure;

    const { stats, paymentBreakdown } = computeAdminAdStats((allSubsResult.data ?? []) as AdStatsRow[]);
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
