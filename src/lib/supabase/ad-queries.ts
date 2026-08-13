import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, createAdminClient } from "./server";
import { getStorageUrl, getAvatarUrl } from "./storage-utils";
import { escapeLikePattern } from "./query-utils";
import { monthStartKST } from "@/lib/utils/format";
import { isAdRunning, adStatusFilterExpr, AD_STATUS_ACTIVE, AD_STATUS_EXPIRED, AD_STATUS_CANCELLED, AD_STATUS_PENDING } from "@/lib/ad-status";
import type { AdDurationOption, AdPlan, AdPortfolioSlot, AdSubscription, AdSubscriptionStatus, ActiveAdArtist } from "@/types/ads";
import type { Database } from "@/types/database";

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
    // service_role — ad_subscriptions 는 RLS SELECT 정책만 있고 INSERT 정책이 없어 createClient insert 는
    // 무음 실패(0행)한다. 구매 라우트(/api/ads/purchase)가 아티스트 인증·플랜 검증을 선행하므로 안전.
    const supabase = createAdminClient();
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
            status: params.paidByCash > 0 ? AD_STATUS_PENDING : AD_STATUS_ACTIVE,
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
    // service_role 사용 — ad_subscriptions 는 RLS SELECT 정책만 있고 UPDATE 정책이 없어
    // createClient(authenticated) UPDATE 는 0행으로 무음 실패한다. 인증·결제 검증은 verify 라우트가 수행.
    const supabase = createAdminClient();
    const { data: sub } = await supabase
        .from("ad_subscriptions").select("duration_months").eq("id", subscriptionId).single();
    const months = sub?.duration_months ?? 1;
    const now = new Date().toISOString();
    const expiresAt = getExpiryDate(months * DAYS_PER_MONTH);

    // PENDING → ACTIVE 원자적 활성화. 이미 ACTIVE 면 0행 → 재검증(같은 impUid replay)으로 간주하여
    // 기존 행을 그대로 반환(started_at/expires_at 리셋 = 광고 기간 연장 방지, H3 멱등).
    const { data } = await supabase
        .from("ad_subscriptions")
        .update({
            status: AD_STATUS_ACTIVE,
            started_at: now,
            expires_at: expiresAt,
            imp_uid: impUid,
        })
        .eq("id", subscriptionId)
        .eq("status", AD_STATUS_PENDING)
        .select();

    if (data && data.length > 0) return data[0] as AdSubscription;

    // 0행: 이미 ACTIVE(정상 replay)면 그 행을 변경 없이 반환, 그 외 상태면 활성화 불가 → 에러.
    const { data: existing } = await supabase
        .from("ad_subscriptions").select("*").eq("id", subscriptionId).single();
    if (existing && (existing as { status: string }).status === AD_STATUS_ACTIVE) {
        return existing as AdSubscription;
    }
    throw new Error("Failed to activate subscription: not in PENDING/ACTIVE state");
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
        .eq("status", AD_STATUS_ACTIVE)
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
        .eq("status", AD_STATUS_ACTIVE)
        .gt("expires_at", now)
        .order("created_at", { ascending: true });

    return (data ?? []) as AdSubscription[];
}

/**
 * 구독 취소를 원자적으로 "claim" — fromStatus 인 경우에만 CANCELLED 로 전이.
 * 단일 UPDATE(WHERE status=fromStatus)라 동시/재시도 호출 중 정확히 1건만 성공(true 반환) →
 * 이중 환불·부분 실패(포인트만 환급되고 구독은 ACTIVE) 방지(H4 멱등성).
 * service_role 사용 — ad_subscriptions write RLS 정책 부재로 createClient 는 무효일 수 있음.
 */
export async function cancelSubscription(
    subscriptionId: string,
    fromStatus: AdSubscriptionStatus,
): Promise<boolean> {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from("ad_subscriptions")
        .update({ status: AD_STATUS_CANCELLED })
        .eq("id", subscriptionId)
        .eq("status", fromStatus)
        .select("id");
    return (data?.length ?? 0) > 0;
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
        .eq("status", AD_STATUS_ACTIVE)
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

// ─── Ad Events (통계 단일 진실 소스) ──────────────────────

/**
 * 구독별 노출(IMPRESSION)/클릭(CLICK) 수를 ad_events 에서 직접 집계한다.
 * ad_events 가 광고 통계의 단일 진실 소스 — 레거시 카운터 컬럼(impression_count 등)은 더 이상 읽지 않는다.
 * (노출/클릭 기록은 lib/supabase/ad-events.ts recordAdPortfolioEvents 가 ad_events 에 적재.)
 * 집계값은 비민감이므로 service_role 로 호출해 sparse RLS 를 우회한다.
 */
export async function getAdEventCounts(
    subscriptionIds: string[],
): Promise<Map<string, { impressions: number; clicks: number }>> {
    const map = new Map<string, { impressions: number; clicks: number }>();
    if (subscriptionIds.length === 0) return map;

    const { data } = await createAdminClient()
        .rpc("ad_event_counts", { p_subscription_ids: subscriptionIds });

    for (const row of data ?? []) {
        map.set(row.subscription_id, { impressions: row.impressions, clicks: row.clicks });
    }
    return map;
}

// ─── Expiration Cron ─────────────────────────────────────

/** Mark expired subscriptions as EXPIRED */
export async function expireOldSubscriptions(): Promise<number> {
    // service_role — cron(사용자 세션 없음) 컨텍스트라 owner 기반 RLS SELECT 로는 0건 조회 + UPDATE 정책
    // 부재로 무음 실패한다. 전 아티스트 만료 구독을 일괄 처리해야 하므로 admin client 필수.
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // 단일 가드 UPDATE — ACTIVE & 만료된 구독을 EXPIRED 로 전이. SELECT 왕복 제거 + RETURNING 으로
    // 실제 처리 건수 정확 반환(기존 SELECT-then-UPDATE 의 오해 소지 카운트/에러 무시 개선).
    // 경계 포함(lte) — lt 로 두면 만료 정각 행이 화면엔 "만료"인데 크론은 영원히 안 건드린다.
    // expires_at IS NULL 인 ACTIVE 행은 일부러 제외한다: 정상 경로로는 생기지 않는 이상 데이터라
    // 화면에선 만료로 닫아 보여주되(adStatusFilterExpr) 상태를 덮어써 원인 추적 단서를 지우지 않는다.
    const { data, error } = await supabase
        .from("ad_subscriptions")
        .update({ status: AD_STATUS_EXPIRED })
        .eq("status", AD_STATUS_ACTIVE)
        .lte("expires_at", now)
        .select("id");

    if (error) throw new Error(`Failed to expire subscriptions: ${error.message}`);
    return data?.length ?? 0;
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
            status: AD_STATUS_ACTIVE,
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
        .select("artist_id, status, expires_at, plan:ad_plans(max_portfolios)")
        .eq("id", subscriptionId)
        .single();
    if (!sub) throw new Error("구독을 찾을 수 없습니다.");
    // 광고가 실제로 나가는 중일 때만 슬롯 변경 허용 — 화면 게이트(isAdRunning)와 같은 기준이라
    // "UI 에선 막혔는데 API 는 통과" 가 생기지 않는다. status 컬럼만 보면 크론 실행 전 만료건이 통과한다.
    if (!isAdRunning(sub.status, sub.expires_at)) {
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
 *  활성/만료 조건은 목록 탭·배지와 같은 SSOT 표현식(adStatusFilterExpr)을 그대로 쓴다. */
export async function fetchGrantStats(
    adminClient: SupabaseClient<Database>,
): Promise<AdminGrantStats> {
    const now = new Date();
    // KST 기준 월초 — 서버 로컬 시각으로 계산하면 Vercel(UTC)에서 매월 1일 00:00~09:00(KST) 부여가
    // "이번달 부여" 에서 통째로 빠진다(개발 PC 는 KST 라 로컬에선 안 보이는 차이).
    const monthStart = monthStartKST();
    const base = (): ReturnType<typeof adminClient.from> => adminClient.from("ad_subscriptions");
    const prefix = `${ADMIN_GRANT_PREFIX}%`;

    const [totalRes, activeRes, expiredRes, monthRes] = await Promise.all([
        base().select("id", { count: "exact", head: true }).like("merchant_uid", prefix),
        base().select("id", { count: "exact", head: true })
            .like("merchant_uid", prefix).or(adStatusFilterExpr(AD_STATUS_ACTIVE, now)),
        // 크론 처리분(status=EXPIRED) + 미처리분(ACTIVE 인데 더 이상 안 나감)이 한 조건에 들어 있다
        base().select("id", { count: "exact", head: true })
            .like("merchant_uid", prefix).or(adStatusFilterExpr(AD_STATUS_EXPIRED, now)),
        base().select("id", { count: "exact", head: true })
            .like("merchant_uid", prefix).gte("created_at", monthStart),
    ]);

    return {
        totalCount: totalRes.count ?? 0,
        activeCount: activeRes.count ?? 0,
        expiredCount: expiredRes.count ?? 0,
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

// impression/click 은 ad_subscriptions 컬럼이 아니라 ad_events 집계(getAdEventCounts)에서 채운다.
const GRANTS_SELECT =
    "id, artist_id, status, started_at, expires_at, duration_months, created_at, artist:artists(id, title, profile_image_path), slots:ad_portfolio_slots(portfolio_id)";

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

/** raw 구독 row → AdminGrantRow 매핑 (노출/클릭은 ad_events 집계값을 주입) */
function mapGrantRow(g: AdminGrantRowRaw, counts?: { impressions: number; clicks: number }): AdminGrantRow {
    return {
        id: g.id,
        artistId: g.artist_id,
        artistTitle: g.artist?.title ?? "(이름 없음)",
        artistProfileImage: getAvatarUrl(g.artist?.profile_image_path ?? null),
        status: g.status,
        startedAt: g.started_at,
        expiresAt: g.expires_at,
        durationMonths: g.duration_months,
        impressionCount: counts?.impressions ?? 0,
        clickCount: counts?.clicks ?? 0,
        slotCount: (g.slots ?? []).length,
        createdAt: g.created_at,
    };
}

/**
 * 목록 쿼리 조립 — 상태 필터는 만료일까지 함께 판정(규칙은 lib/ad-status.ts 한 곳).
 * 반환 타입은 추론에 맡긴다: PostgrestFilterBuilder 제네릭을 손으로 적으면 select 문자열과 어긋나고,
 * `ReturnType<typeof client.from>` 별칭은 Database 의 Views 가 비어 있어 any 로 붕괴해 검증을 잃는다.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- 위 주석 참조
function buildGrantsQuery(
    adminClient: SupabaseClient<Database>,
    options: ListGrantsOptions,
    searchArtistIds: string[] | null,
    page: number,
    pageSize: number,
) {
    let query = adminClient
        .from("ad_subscriptions")
        .select(GRANTS_SELECT, { count: "exact" })
        .like("merchant_uid", `${ADMIN_GRANT_PREFIX}%`)
        .order("created_at", { ascending: false });

    if (options.status && options.status !== "ALL") {
        query = query.or(adStatusFilterExpr(options.status, Date.now()));
    }
    if (searchArtistIds) query = query.in("artist_id", searchArtistIds);
    return query.range((page - 1) * pageSize, page * pageSize - 1);
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

    const query = buildGrantsQuery(adminClient, options, searchArtistIds, page, pageSize);
    const [{ data: grants, count, error }, stats] = await Promise.all([
        query,
        includeStats ? fetchGrantStats(adminClient) : Promise.resolve(null),
    ]);
    // 에러를 삼키면 화면이 "부여 내역이 없습니다" 로 거짓말하고 통계까지 어긋난다 → 라우트가 500 으로 매핑
    if (error) {
        // 원문 메시지는 컬럼·제약명을 노출한다 → 로그에만 남기고 호출부에는 고정 문구
        // eslint-disable-next-line no-console -- error logging
        console.error("[listAdminGrants] query failed:", error.message);
        throw new Error("부여 목록을 불러오지 못했습니다");
    }

    const totalCount = count ?? 0;
    const rows = (grants ?? []) as unknown as AdminGrantRowRaw[];
    const counts = await getAdEventCounts(rows.map((r) => r.id));
    return {
        grants: rows.map((r) => mapGrantRow(r, counts.get(r.id))),
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
