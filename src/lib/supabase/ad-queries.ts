import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, createAdminClient } from "./server";
import { getStorageUrl, getAvatarUrl } from "./storage-utils";
import { escapeLikePattern } from "./query-utils";
import type { AdDurationOption, AdPlan, AdPortfolioSlot, AdSubscription, AdSubscriptionStatus, ActiveAdArtist } from "@/types/ads";
import type { Database } from "@/types/database";

const STATUS_ACTIVE: AdSubscriptionStatus = "ACTIVE";
const SELECT_WITH_PLAN = "*, plan:ad_plans(*)";
const DAYS_PER_MONTH = 30;

// ─── Plans ───────────────────────────────────────────────

/** Get all active ad plans, optionally filtered by artist type */
export async function getAdPlans(artistType?: "SEMI_PERMANENT"): Promise<AdPlan[]> {
    const supabase = await createClient();
    let query = supabase
        .from("ad_plans")
        .select("*")
        .eq("is_active", true);

    if (artistType) {
        query = query.eq("artist_type", artistType);
    }

    const { data } = await query.order("price", { ascending: true });
    return (data ?? []) as AdPlan[];
}

/** Get all active duration options */
export async function getAdDurationOptions(): Promise<AdDurationOption[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from("ad_duration_options")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

    return (data ?? []) as AdDurationOption[];
}

// ─── Subscriptions ───────────────────────────────────────

/** Create a new ad subscription (PENDING status) */
export async function createAdSubscription(params: {
    artistId: string;
    planId: string;
    pricePaid: number;
    paidByPoints: number;
    paidByCash: number;
    merchantUid: string;
    durationMonths: number;
}): Promise<AdSubscription> {
    const days = params.durationMonths * DAYS_PER_MONTH;
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("ad_subscriptions")
        .insert({
            artist_id: params.artistId,
            plan_id: params.planId,
            price_paid: params.pricePaid,
            paid_by_points: params.paidByPoints,
            paid_by_cash: params.paidByCash,
            merchant_uid: params.merchantUid,
            duration_months: params.durationMonths,
            status: params.paidByCash > 0 ? "PENDING" : STATUS_ACTIVE,
            started_at: params.paidByCash === 0 ? new Date().toISOString() : null,
            expires_at: params.paidByCash === 0 ? getExpiryDate(days) : null,
        })
        .select()
        .single();

    if (error) throw new Error(`Failed to create subscription: ${error.message}`);
    return data as AdSubscription;
}

/** Activate a PENDING subscription after PortOne payment verification */
export async function activateSubscription(
    subscriptionId: string,
    impUid: string,
): Promise<AdSubscription> {
    const supabase = await createClient();
    const { data: sub } = await supabase
        .from("ad_subscriptions").select("duration_months").eq("id", subscriptionId).single();
    const months = sub?.duration_months ?? 1;
    const now = new Date().toISOString();
    const expiresAt = getExpiryDate(months * DAYS_PER_MONTH);

    const { data, error } = await supabase
        .from("ad_subscriptions")
        .update({
            status: STATUS_ACTIVE,
            started_at: now,
            expires_at: expiresAt,
            imp_uid: impUid,
        })
        .eq("id", subscriptionId)
        .select()
        .single();

    if (error) throw new Error(`Failed to activate subscription: ${error.message}`);
    return data as AdSubscription;
}

/** Get subscriptions for an artist */
export async function getArtistSubscriptions(artistId: string): Promise<AdSubscription[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from("ad_subscriptions")
        .select(SELECT_WITH_PLAN)
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });

    return (data ?? []) as AdSubscription[];
}

/** Get the current active subscription for an artist (if any) */
export async function getActiveSubscription(artistId: string): Promise<AdSubscription | null> {
    const supabase = await createClient();
    const now = new Date().toISOString();

    const { data } = await supabase
        .from("ad_subscriptions")
        .select(SELECT_WITH_PLAN)
        .eq("artist_id", artistId)
        .eq("status", STATUS_ACTIVE)
        .gt("expires_at", now)
        .order("expires_at", { ascending: false })
        .limit(1)
        .single();

    return (data as AdSubscription) ?? null;
}

/** Get ALL active subscriptions for an artist */
export async function getActiveSubscriptions(artistId: string): Promise<AdSubscription[]> {
    const supabase = await createClient();
    const now = new Date().toISOString();

    const { data } = await supabase
        .from("ad_subscriptions")
        .select(SELECT_WITH_PLAN)
        .eq("artist_id", artistId)
        .eq("status", STATUS_ACTIVE)
        .gt("expires_at", now)
        .order("created_at", { ascending: true });

    return (data ?? []) as AdSubscription[];
}

/** Cancel a subscription */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
    const supabase = await createClient();
    await supabase
        .from("ad_subscriptions")
        .update({ status: "CANCELLED" as AdSubscriptionStatus })
        .eq("id", subscriptionId);
}

// ─── Active Ads (for rendering) ──────────────────────────

/**
 * Get all currently active ad artists (for search/homepage display).
 * createAdminClient(service_role) 사용 — ad_subscriptions/ad_portfolio_slots 에 anon SELECT
 * RLS 정책이 없어 createStaticClient(anon) 로는 항상 0건이 반환됐다(= 광고가 어디에도 안 뜨던 근본 원인).
 * service_role 도 cookies 를 안 써서 ISR/Static prerender 는 그대로 유지된다.
 * 반환값은 활성·공개 프로모 데이터(artist_id/title/슬롯 id)뿐 — 민감정보 미포함.
 */
export async function getActiveAdArtists(): Promise<ActiveAdArtist[]> {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const { data } = await supabase
        .from("ad_subscriptions")
        .select(`
      id,
      artist_id,
      artist:artists!inner(title, profile_image_path),
      slots:ad_portfolio_slots(portfolio_id)
    `)
        .eq("status", STATUS_ACTIVE)
        .gt("expires_at", now);

    if (!data) return [];

    return (data as { id: string; artist_id: string; artist: { title: string; profile_image_path: string | null }; slots: { portfolio_id: string }[] }[]).map(row => ({
        artist_id: row.artist_id,
        subscription_id: row.id,
        artist_title: row.artist.title,
        profile_image_path: getAvatarUrl(row.artist.profile_image_path),
        portfolio_ids: row.slots.map(s => s.portfolio_id),
    }));
}

// ─── Ad Events ───────────────────────────────────────────

/** Record an ad impression or click */
export async function recordAdEvent(params: {
    subscriptionId: string;
    eventType: "IMPRESSION" | "CLICK";
    placement: string;
    pagePath?: string;
}): Promise<void> {
    const supabase = await createClient();

    await supabase
        .from("ad_events")
        .insert({
            subscription_id: params.subscriptionId,
            event_type: params.eventType,
            placement: params.placement,
            page_path: params.pagePath ?? null,
        });

    const field = params.eventType === "CLICK" ? "click_count" : "impression_count";
    const { data: sub } = await supabase
        .from("ad_subscriptions")
        .select(field)
        .eq("id", params.subscriptionId)
        .single();

    if (sub) {
        // eslint-disable-next-line security/detect-object-injection -- Safe: known key lookup
        const currentCount = (sub as Record<string, number>)[field] ?? 0;
        await supabase
            .from("ad_subscriptions")
            .update({ [field]: currentCount + 1 })
            .eq("id", params.subscriptionId);
    }
}

// ─── Expiration Cron ─────────────────────────────────────

/** Mark expired subscriptions as EXPIRED */
export async function expireOldSubscriptions(): Promise<number> {
    const supabase = await createClient();
    const now = new Date().toISOString();

    const { data } = await supabase
        .from("ad_subscriptions")
        .select("id")
        .eq("status", STATUS_ACTIVE)
        .lt("expires_at", now);

    if (!data || data.length === 0) return 0;

    const ids = data.map(r => r.id);
    await supabase
        .from("ad_subscriptions")
        .update({ status: "EXPIRED" as AdSubscriptionStatus })
        .in("id", ids);

    return ids.length;
}

// ─── Admin Stats ─────────────────────────────────────────

/** Get ad revenue stats for admin dashboard, optionally filtered by artist type */
export async function getAdRevenueStats(artistType?: "SEMI_PERMANENT"): Promise<{
    totalRevenue: number;
    activeCount: number;
    totalCount: number;
}> {
    const supabase = await createClient();
    const now = new Date().toISOString();

    let query = supabase
        .from("ad_subscriptions")
        .select("price_paid, status, expires_at, plan:ad_plans!inner(artist_type)");

    if (artistType) {
        query = query.eq("plan.artist_type", artistType);
    }

    const { data: allSubs } = await query;

    const subs = (allSubs ?? []) as { price_paid: number; status: string; expires_at: string }[];
    const confirmedSubs = subs.filter(s => s.status === STATUS_ACTIVE || s.status === "EXPIRED");
    const totalRevenue = confirmedSubs.reduce((sum, s) => sum + s.price_paid, 0);
    const activeCount = subs.filter(s => s.status === STATUS_ACTIVE && s.expires_at > now).length;

    return { totalRevenue, activeCount, totalCount: confirmedSubs.length };
}

// ─── Portfolio Slots ────────────────────────────────────

/** Get portfolio slots for a subscription */
export async function getAdPortfolioSlots(subscriptionId: string): Promise<AdPortfolioSlot[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from("ad_portfolio_slots")
        .select("*")
        .eq("subscription_id", subscriptionId)
        .order("created_at", { ascending: true });

    return (data ?? []) as AdPortfolioSlot[];
}

/** Set portfolio slots for a subscription (replace all) */
export async function setAdPortfolioSlots(
    subscriptionId: string,
    portfolioIds: string[],
): Promise<AdPortfolioSlot[]> {
    const supabase = await createClient();

    await supabase
        .from("ad_portfolio_slots")
        .delete()
        .eq("subscription_id", subscriptionId);

    if (portfolioIds.length === 0) return [];

    const rows = portfolioIds.map(pid => ({
        subscription_id: subscriptionId,
        portfolio_id: pid,
    }));

    const { data, error } = await supabase
        .from("ad_portfolio_slots")
        .insert(rows)
        .select();

    if (error) throw new Error(`Failed to set portfolio slots: ${error.message}`);
    return (data ?? []) as AdPortfolioSlot[];
}

// ─── Admin Grant ────────────────────────────────────────

// 상수는 ad-constants.ts 에서 import — server/client 양쪽 안전
export { ADMIN_GRANT_PREFIX, VALID_GRANT_MONTHS, MAX_PAGE_SIZE } from "./ad-constants";
import { ADMIN_GRANT_PREFIX, MAX_PAGE_SIZE, DEFAULT_MAX_PORTFOLIOS, MAX_ARTIST_SEARCH_FILTER_IDS, GRANTS_PAGE_SIZE } from "./ad-constants";

export async function grantFreeSubscription(
    adminClient: SupabaseClient<Database>,
    artistId: string,
    durationMonths: number,
    portfolioIds?: string[],
): Promise<AdSubscription> {
    const [{ data: artist }, { data: plan }] = await Promise.all([
        adminClient.from("artists").select("id").eq("id", artistId).single(),
        adminClient.from("ad_plans").select("id, max_portfolios").eq("is_active", true)
            .order("price", { ascending: true }).limit(1).single(),
    ]);

    if (!artist) throw new Error("아티스트를 찾을 수 없습니다.");
    if (!plan) throw new Error("활성 광고 플랜이 없습니다.");

    const now = new Date().toISOString();
    const days = durationMonths * DAYS_PER_MONTH;

    const { data, error } = await adminClient
        .from("ad_subscriptions")
        .insert({
            artist_id: artistId,
            plan_id: plan.id,
            price_paid: 0,
            paid_by_points: 0,
            paid_by_cash: 0,
            merchant_uid: `${ADMIN_GRANT_PREFIX}${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
            duration_months: durationMonths,
            status: STATUS_ACTIVE,
            started_at: now,
            expires_at: getExpiryDate(days),
        })
        .select()
        .single();

    if (error) throw new Error(`무료 광고 부여 실패: ${error.message}`);

    // 부여 시점에 슬롯도 같이 설정 — 회원이 직접 슬롯 선택 단계 회피
    if (portfolioIds && portfolioIds.length > 0) {
        const validIds = await filterArtistPortfolios(adminClient, artistId, portfolioIds);
        const capped = validIds.slice(0, plan.max_portfolios ?? DEFAULT_MAX_PORTFOLIOS);
        if (capped.length > 0) {
            const { error: slotsError } = await adminClient.from("ad_portfolio_slots").insert(
                capped.map((pid) => ({ subscription_id: data.id, portfolio_id: pid })),
            );
            if (slotsError) throw new Error(`슬롯 설정 실패: ${slotsError.message}`);
        }
    }

    return data as AdSubscription;
}

/** 관리자: 특정 구독의 슬롯을 회원 대신 직접 설정 (소유권/max/상태 검증) */
export async function setSlotsAsAdmin(
    adminClient: SupabaseClient<Database>,
    subscriptionId: string,
    portfolioIds: string[],
): Promise<string[]> {
    const { data: sub } = await adminClient
        .from("ad_subscriptions")
        .select("artist_id, status, plan:ad_plans(max_portfolios)")
        .eq("id", subscriptionId)
        .single();
    if (!sub) throw new Error("구독을 찾을 수 없습니다.");
    // 종료된 구독에는 슬롯 변경 불가 — UI에서는 ACTIVE 만 노출되지만 API 단에서도 가드
    if (sub.status === "CANCELLED" || sub.status === "EXPIRED") {
        throw new Error("종료된 구독은 슬롯을 변경할 수 없습니다.");
    }

    const plan = sub.plan as { max_portfolios?: number } | null;
    const max = plan?.max_portfolios ?? DEFAULT_MAX_PORTFOLIOS;
    if (portfolioIds.length > max) throw new Error(`최대 ${max}개까지 선택 가능합니다.`);

    const validIds = await filterArtistPortfolios(adminClient, sub.artist_id, portfolioIds);
    if (validIds.length !== portfolioIds.length) {
        throw new Error("회원 소유가 아닌 포트폴리오가 포함되어 있습니다.");
    }

    await adminClient.from("ad_portfolio_slots").delete().eq("subscription_id", subscriptionId);
    if (validIds.length === 0) return [];

    const { error } = await adminClient.from("ad_portfolio_slots").insert(
        validIds.map((pid) => ({ subscription_id: subscriptionId, portfolio_id: pid })),
    );
    if (error) throw new Error(`슬롯 설정 실패: ${error.message}`);
    return validIds;
}

export interface AdminGrantStats {
    totalCount: number;
    activeCount: number;
    expiredCount: number;
    thisMonthCount: number;
}

/** 통계 4개를 head:true count 쿼리 4번으로 집계 — 행 데이터 fetch 없이 카운트만.
 *  expired 는 두 쿼리(status=EXPIRED + active-but-past-expiry)를 합쳐 .or() 문자열 보간 제거. */
export async function fetchGrantStats(
    adminClient: SupabaseClient<Database>,
): Promise<AdminGrantStats> {
    const now = new Date();
    const nowIso = now.toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const base = (): ReturnType<typeof adminClient.from> => adminClient.from("ad_subscriptions");
    const prefix = `${ADMIN_GRANT_PREFIX}%`;

    const [totalRes, activeRes, expiredByStatusRes, expiredByDateRes, monthRes] = await Promise.all([
        base().select("id", { count: "exact", head: true }).like("merchant_uid", prefix),
        base().select("id", { count: "exact", head: true })
            .like("merchant_uid", prefix).eq("status", STATUS_ACTIVE).gt("expires_at", nowIso),
        // status 가 명시적으로 EXPIRED 인 것 (cron 처리됨)
        base().select("id", { count: "exact", head: true })
            .like("merchant_uid", prefix).eq("status", "EXPIRED"),
        // status 는 ACTIVE 지만 만료 시점이 지난 것 (cron 미처리, expired와 중복 안 됨)
        base().select("id", { count: "exact", head: true })
            .like("merchant_uid", prefix).eq("status", STATUS_ACTIVE).lte("expires_at", nowIso),
        base().select("id", { count: "exact", head: true })
            .like("merchant_uid", prefix).gte("created_at", monthStart),
    ]);

    return {
        totalCount: totalRes.count ?? 0,
        activeCount: activeRes.count ?? 0,
        expiredCount: (expiredByStatusRes.count ?? 0) + (expiredByDateRes.count ?? 0),
        thisMonthCount: monthRes.count ?? 0,
    };
}

/** 검색어 → 아티스트 ID 목록 매핑 (없으면 null = 결과 없음) */
async function resolveSearchArtistIds(
    adminClient: SupabaseClient<Database>,
    search: string,
): Promise<string[] | null> {
    const { data } = await adminClient
        .from("artists").select("id")
        .ilike("title", `%${escapeLikePattern(search)}%`)
        .limit(MAX_ARTIST_SEARCH_FILTER_IDS);
    const ids = (data ?? []).map((a) => a.id);
    return ids.length === 0 ? null : ids;
}

export interface AdminGrantsListResult {
    grants: AdminGrantRow[];
    /** includeStats=false 면 null — 페이지 변경/필터 변경 시 4쿼리 절약 */
    stats: AdminGrantStats | null;
    pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
}

const GRANTS_SELECT =
    "id, artist_id, status, started_at, expires_at, duration_months, impression_count, click_count, created_at, artist:artists(id, title, profile_image_path), slots:ad_portfolio_slots(portfolio_id)";

interface ListGrantsOptions {
    page?: number;
    pageSize?: number;
    status?: AdSubscriptionStatus | "ALL";
    search?: string;
    /** 첫 로드만 true — 페이지/필터 변경 시 false 로 4쿼리 비용 절약 */
    includeStats?: boolean;
}

/** page/pageSize/includeStats 기본값·범위 정규화 (listAdminGrants 복잡도 분리) */
function normalizeGrantOptions(options: ListGrantsOptions): { page: number; pageSize: number; includeStats: boolean } {
    return {
        page: Math.max(1, options.page ?? 1),
        pageSize: Math.max(1, Math.min(MAX_PAGE_SIZE, options.pageSize ?? GRANTS_PAGE_SIZE)),
        includeStats: options.includeStats ?? false,
    };
}

/** 검색 결과 0건 등 빈 목록 응답 */
function emptyGrantsResult(page: number, pageSize: number, includeStats: boolean): AdminGrantsListResult {
    return {
        grants: [],
        stats: includeStats ? { totalCount: 0, activeCount: 0, expiredCount: 0, thisMonthCount: 0 } : null,
        pagination: { page, pageSize, totalCount: 0, totalPages: 0 },
    };
}

/** raw 구독 row → AdminGrantRow 매핑 */
function mapGrantRow(g: AdminGrantRowRaw): AdminGrantRow {
    return {
        id: g.id,
        artistId: g.artist_id,
        artistTitle: g.artist?.title ?? "(이름 없음)",
        artistProfileImage: getAvatarUrl(g.artist?.profile_image_path ?? null),
        status: g.status,
        startedAt: g.started_at,
        expiresAt: g.expires_at,
        durationMonths: g.duration_months,
        impressionCount: g.impression_count,
        clickCount: g.click_count,
        slotCount: (g.slots ?? []).length,
        createdAt: g.created_at,
    };
}

/** 관리자: 무료 부여 구독 목록 + 통계 (merchant_uid prefix `ADMIN_GRANT-` 로 필터) */
export async function listAdminGrants(
    adminClient: SupabaseClient<Database>,
    options: ListGrantsOptions = {},
): Promise<AdminGrantsListResult> {
    const { page, pageSize, includeStats } = normalizeGrantOptions(options);

    let searchArtistIds: string[] | null = null;
    if (options.search) {
        searchArtistIds = await resolveSearchArtistIds(adminClient, options.search);
        if (searchArtistIds === null) return emptyGrantsResult(page, pageSize, includeStats);
    }

    let query = adminClient
        .from("ad_subscriptions")
        .select(GRANTS_SELECT, { count: "exact" })
        .like("merchant_uid", `${ADMIN_GRANT_PREFIX}%`)
        .order("created_at", { ascending: false });

    if (options.status && options.status !== "ALL") query = query.eq("status", options.status);
    if (searchArtistIds) query = query.in("artist_id", searchArtistIds);
    query = query.range((page - 1) * pageSize, page * pageSize - 1);

    const [{ data: grants, count }, stats] = await Promise.all([
        query,
        includeStats ? fetchGrantStats(adminClient) : Promise.resolve(null),
    ]);

    const totalCount = count ?? 0;
    const rows = (grants ?? []) as unknown as AdminGrantRowRaw[];
    return {
        grants: rows.map(mapGrantRow),
        stats,
        pagination: { page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) },
    };
}

/** 관리자: 특정 회원의 포트폴리오 + 썸네일 + 현재 슬롯 정보 */
export async function getArtistPortfoliosForAdmin(
    adminClient: SupabaseClient<Database>,
    artistId: string,
    subscriptionId?: string,
): Promise<{
    portfolios: { id: string; title: string; thumbnail: string | null }[];
    currentSlots: string[];
    maxPortfolios: number;
}> {
    const [portfoliosResult, slotsResult, planResult] = await Promise.all([
        adminClient
            .from("portfolios")
            .select("id, title, portfolio_media(storage_path, order_index)")
            .eq("artist_id", artistId)
            .is("deleted_at", null)
            .order("created_at", { ascending: false }),
        subscriptionId
            ? adminClient.from("ad_portfolio_slots").select("portfolio_id").eq("subscription_id", subscriptionId)
            : Promise.resolve({ data: [] as { portfolio_id: string }[] }),
        subscriptionId
            ? adminClient
                .from("ad_subscriptions")
                .select("plan:ad_plans(max_portfolios)")
                .eq("id", subscriptionId)
                .single()
            : Promise.resolve({ data: null }),
    ]);

    const rows = (portfoliosResult.data ?? []) as {
        id: string; title: string; portfolio_media: { storage_path: string; order_index: number }[];
    }[];

    const portfolios = rows.map((p) => {
        const sorted = [...p.portfolio_media].sort((a, b) => a.order_index - b.order_index);
        return {
            id: p.id,
            title: p.title,
            thumbnail: getStorageUrl(sorted[0]?.storage_path ?? null),
        };
    });

    const planData = planResult.data as { plan?: { max_portfolios?: number } } | null;
    return {
        portfolios,
        currentSlots: (slotsResult.data ?? []).map((s) => s.portfolio_id),
        maxPortfolios: planData?.plan?.max_portfolios ?? DEFAULT_MAX_PORTFOLIOS,
    };
}

/** Helper: 회원 소유 포트폴리오만 필터링 */
async function filterArtistPortfolios(
    adminClient: SupabaseClient<Database>,
    artistId: string,
    portfolioIds: string[],
): Promise<string[]> {
    if (portfolioIds.length === 0) return [];
    const { data } = await adminClient
        .from("portfolios")
        .select("id")
        .eq("artist_id", artistId)
        .in("id", portfolioIds)
        .is("deleted_at", null);
    const valid = new Set((data ?? []).map((p) => p.id));
    return portfolioIds.filter((id) => valid.has(id));
}

interface AdminGrantRowRaw {
    id: string;
    artist_id: string;
    artist?: { id: string; title: string; profile_image_path: string | null } | null;
    status: AdSubscriptionStatus;
    started_at: string | null;
    expires_at: string | null;
    duration_months: number;
    impression_count: number;
    click_count: number;
    slots?: { portfolio_id: string }[];
    created_at: string;
}

export interface AdminGrantRow {
    id: string;
    artistId: string;
    artistTitle: string;
    artistProfileImage: string | null;
    status: AdSubscriptionStatus;
    startedAt: string | null;
    expiresAt: string | null;
    durationMonths: number;
    impressionCount: number;
    clickCount: number;
    slotCount: number;
    createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────

function getExpiryDate(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
}
