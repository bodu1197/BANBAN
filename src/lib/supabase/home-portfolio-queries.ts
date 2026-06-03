import { unstable_cache } from "next/cache";
import { createStaticClient } from "./server";
import type { ArtistTypeFilter } from "./home-artist-queries";
import {
  type PortfolioRow,
  type PortfolioRowWithType,
  type HomePortfolio,
  SELECT_BASIC,
  SELECT_WITH_TYPE,
  mapPortfolioRow,
} from "./portfolio-common";
import { secureShuffle } from "@/lib/random";
import { withAdInjection, AD_INJECTION_FETCH_LIMIT } from "./boost-ranking";

type SupabaseInstance = Awaited<ReturnType<typeof createStaticClient>>;

// === Portfolio Query Builder ===

type PortfolioQueryModifier = (
  query: ReturnType<SupabaseInstance["from"]>,
) => ReturnType<SupabaseInstance["from"]>;

async function getArtistIdsByType(
  supabase: SupabaseInstance,
): Promise<string[]> {
  const { data } = await supabase
    .from("artists")
    .select("id")
    .is("deleted_at", null)
    .eq("is_hide", false)
    .eq("status", "active")
    .gte("portfolio_media_count", 5)
    .eq("type_artist", "SEMI_PERMANENT");

  return (data ?? []).map((a: { id: string }) => a.id);
}

function isVisibleArtist(row: PortfolioRowWithType): boolean {
  const artist = row.artist;
  if (!artist || artist.is_hide || artist.deleted_at || artist.status === "dormant") return false;
  return artist.portfolio_media_count >= 5;
}

/** 광고(유료/부여, 슬롯 보유) 전용 가시성 — 일반 노출 품질바(미디어 ≥5)는 면제하되
 *  숨김·삭제·휴면 아티스트는 계속 제외. 광고주 포폴 수가 적어도 노출 보장. */
function isAdEligibleArtist(row: PortfolioRowWithType): boolean {
  const artist = row.artist;
  return !!artist && !artist.is_hide && !artist.deleted_at && artist.status !== "dormant";
}

function deduplicatePortfolios<T extends { artist_id: string; title: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.artist_id}||${row.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// === Ad injection fetchers (광고 회원 포폴을 "각 섹션과 같은 스코프"로 가져옴) ===
// 자연 목록 쿼리에 .in("artist_id", adArtistIds) 만 더해, 그 섹션 기준으로 광고 회원이
// 노출 자격이 있는 포폴만 가져온다. withAdInjection 이 이를 상단에 주입.

/** 일반 스코프(카테고리 비지정) 광고 포폴 — 자연 목록과 동일 base + modifier(정렬) 재사용 */
async function fetchAdPortfoliosGeneric(
  supabase: SupabaseInstance,
  adArtistIds: string[],
  modifier: PortfolioQueryModifier,
): Promise<HomePortfolio[]> {
  const now = new Date().toISOString();
  const base = supabase
    .from("portfolios")
    .select(SELECT_WITH_TYPE)
    .is("deleted_at", null)
    .gt("price", 0)
    .or(`sale_ended_at.is.null,sale_ended_at.gte.${now}`)
    .in("artist_id", adArtistIds);
  const { data } = await modifier(base).limit(AD_INJECTION_FETCH_LIMIT);
  // 광고풀은 미디어 ≥5 품질바 면제(isAdEligibleArtist) — 부여/유료 광고주는 포폴 수와 무관히 노출.
  const rows = ((data ?? []) as PortfolioRowWithType[]).filter(isAdEligibleArtist);
  return deduplicatePortfolios(rows).map(mapPortfolioRow);
}

/** 카테고리 스코프 광고 포폴 — 자연 목록과 동일 RPC 재사용(카테고리 정확히 일치) */
async function fetchAdPortfoliosByCategory(
  supabase: SupabaseInstance,
  adArtistIds: string[],
  categoryIds: string[],
): Promise<HomePortfolio[]> {
  const now = new Date().toISOString();
  // 광고 전용 RPC — 미디어 ≥5 품질바 없음(부여/유료 광고는 포폴 1장이어도 노출). 자연 카테고리 목록은
  // search_portfolios_by_category_ids(게이트 유지) 그대로. 노출 범위는 .in("artist_id", 활성광고주)로 한정.
  const { data } = await supabase
    .rpc("search_ad_portfolios_by_category_ids", { p_category_ids: categoryIds, p_type_artist: "SEMI_PERMANENT" })
    .select(SELECT_BASIC)
    .gt("price", 0)
    .or(`sale_ended_at.is.null,sale_ended_at.gte.${now}`)
    .in("artist_id", adArtistIds)
    .limit(AD_INJECTION_FETCH_LIMIT);
  return deduplicatePortfolios((data ?? []) as PortfolioRow[]).map(mapPortfolioRow);
}

async function fetchPortfolios(
  modifier: PortfolioQueryModifier,
  limit: number,
  label: string,
): Promise<HomePortfolio[]> {
  const supabase = createStaticClient();

  const fetchMultiplier = 3;

  const now = new Date().toISOString();

  // All artists are now SEMI_PERMANENT — no type filtering needed
  const base = supabase
    .from("portfolios")
    .select(SELECT_WITH_TYPE)
    .is("deleted_at", null)
    .gt("price", 0)
    .or(`sale_ended_at.is.null,sale_ended_at.gte.${now}`);

  const fetchLimit = limit * fetchMultiplier;

  const { data, error } = await modifier(base).limit(fetchLimit);
  if (error) {
    throw new Error(`Failed to fetch ${label}: ${error.message}`);
  }

  const rows = ((data ?? []) as PortfolioRowWithType[]).filter(isVisibleArtist);

  const deduplicated = deduplicatePortfolios(rows);
  const mapped = deduplicated.slice(0, limit).map(mapPortfolioRow);
  return withAdInjection(mapped, (ids) => fetchAdPortfoliosGeneric(supabase, ids, modifier));
}

// === Section 4: Lowest Price Portfolios ===

export async function fetchLowestPricePortfolios(options?: {
  limit?: number;
  typeArtist?: ArtistTypeFilter;
}): Promise<HomePortfolio[]> {
  const { limit = 10, typeArtist } = options ?? {};
  const cacheKey = typeArtist
    ? `home-lowest-price-portfolios-${typeArtist}`
    : "home-lowest-price-portfolios";

  return unstable_cache(
    async () =>
      fetchPortfolios(
        (q) => q.gt("price", 0).order("price", { ascending: true }),
        limit,
        "lowest price portfolios",
      ),
    [cacheKey],
    { revalidate: 60, tags: ["home", "portfolios"] },
  )();
}

// === Section 9: Popular Portfolios ===

export async function fetchPopularPortfolios(options?: {
  limit?: number;
  typeArtist?: ArtistTypeFilter;
}): Promise<HomePortfolio[]> {
  const { limit = 10, typeArtist } = options ?? {};
  const cacheKey = typeArtist
    ? `home-popular-portfolios-${typeArtist}`
    : "home-popular-portfolios";

  return unstable_cache(
    async () =>
      fetchPortfolios(
        (q) => q.order("likes_count", { ascending: false }),
        limit,
        "popular portfolios",
      ),
    [cacheKey],
    { revalidate: 60, tags: ["home", "portfolios"] },
  )();
}

// === Time Sale Portfolios (타임세일 — sale_ended_at이 있는 할인 포트폴리오) ===

export async function fetchTimeSalePortfolios(limit = 10): Promise<HomePortfolio[]> {
  return unstable_cache(
    async (): Promise<HomePortfolio[]> => {
      const supabase = createStaticClient();
      const now = new Date().toISOString();

      const artistIds = await getArtistIdsByType(supabase);
      if (artistIds.length === 0) return [];

      const base = supabase
        .from("portfolios")
        .select(SELECT_BASIC)
        .is("deleted_at", null)
        .gt("price", 0)
        .gt("discount_rate", 0)
        .in("artist_id", artistIds);

      const { data, error } = await base
        .not("sale_ended_at", "is", null)
        .gte("sale_ended_at", now)
        .order("sale_ended_at", { ascending: true })
        .limit(limit * 3);

      if (error) {
        throw new Error(`Failed to fetch time sale portfolios: ${error.message}`);
      }

      const rows = deduplicatePortfolios((data ?? []) as PortfolioRow[]);
      const mapped = rows.slice(0, limit).map(mapPortfolioRow);
      return withAdInjection(mapped, async (adIds) => {
        // 광고 회원 ∩ 유효 SEMI 아티스트 — 타임세일 조건(할인+판매중) 동일 적용
        const validAdIds = adIds.filter((id) => artistIds.includes(id));
        if (validAdIds.length === 0) return [];
        const { data: adData } = await supabase
          .from("portfolios")
          .select(SELECT_BASIC)
          .is("deleted_at", null)
          .gt("price", 0)
          .gt("discount_rate", 0)
          .in("artist_id", validAdIds)
          .not("sale_ended_at", "is", null)
          .gte("sale_ended_at", now)
          .order("sale_ended_at", { ascending: true })
          .limit(AD_INJECTION_FETCH_LIMIT);
        return deduplicatePortfolios((adData ?? []) as PortfolioRow[]).map(mapPortfolioRow);
      });
    },
    [`home-time-sale-portfolios-${limit}`],
    { revalidate: 60, tags: ["home", "portfolios"] },
  )();
}

// === Discount Portfolios (할인 페이지) ===

export async function fetchDiscountPortfolios(options?: {
  limit?: number;
}): Promise<HomePortfolio[]> {
  const { limit = 200 } = options ?? {};

  return unstable_cache(
    async () => {
      const supabase = createStaticClient();
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("portfolios")
        .select(SELECT_WITH_TYPE)
        .is("deleted_at", null)
        .gt("price", 0)
        .gt("discount_rate", 0)
        .or(`sale_ended_at.is.null,sale_ended_at.gte.${now}`)
        .limit(limit * 3);

      if (error) {
        throw new Error(`Failed to fetch discount portfolios: ${error.message}`);
      }

      const rows = deduplicatePortfolios((data ?? []) as PortfolioRowWithType[]);
      const filtered = rows
        .filter((r) => r.artist && !r.artist.is_hide && !r.artist.deleted_at)
        .map((r) => ({ ...mapPortfolioRow(r), artistType: r.artist?.type_artist ?? "SEMI_PERMANENT" }));
      const shuffled = secureShuffle(filtered).slice(0, limit);
      return withAdInjection(shuffled, async (adIds) => {
        const { data: adData } = await supabase
          .from("portfolios")
          .select(SELECT_WITH_TYPE)
          .is("deleted_at", null)
          .gt("price", 0)
          .gt("discount_rate", 0)
          .or(`sale_ended_at.is.null,sale_ended_at.gte.${now}`)
          .in("artist_id", adIds)
          .limit(AD_INJECTION_FETCH_LIMIT);
        return ((adData ?? []) as PortfolioRowWithType[])
          .filter((r) => r.artist && !r.artist.is_hide && !r.artist.deleted_at)
          .map((r) => ({ ...mapPortfolioRow(r), artistType: r.artist?.type_artist ?? "SEMI_PERMANENT" }));
      });
    },
    ["discount-portfolios"],
    { revalidate: 60, tags: ["portfolios"] },
  )();
}

// === Eyebrow Portfolios (여자눈썹) ===

const EYEBROW_CATEGORY_IDS = [
  "cc6bde80-f547-4377-b45c-741aba87f7e3", // 여자눈썹
  "f7d9e655-2011-4ecb-92a5-213f518fef26", // 그라데이션
  "1c3420b8-1c2b-41da-ae15-c527ab6e15e4", // 엠보
  "02c35ca0-fdd2-4eef-b19f-095a928fc47b", // 콤보
];

const LIP_CATEGORY_IDS = [
  "011ef81b-94ba-4b4e-83ba-c00aef3644f9", // 입술
  "36da5c29-142d-49fb-b105-c094ac36d503", // 인커브 입술
  "0469b84b-0c25-405e-ac1e-240de42c54ff", // 아웃커브 입술
  "6c5bb7d6-e244-4d4a-9898-3ec47218fec5", // 스트레이트 입술
  "40246e39-ba57-4174-95d9-b6a1bdf8e58a", // 톤업
];

export async function fetchLipPortfolios(limit = 10): Promise<HomePortfolio[]> {
  return unstable_cache(
    async () => {
      const supabase = createStaticClient();
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .rpc("search_portfolios_by_category_ids", { p_category_ids: LIP_CATEGORY_IDS, p_type_artist: "SEMI_PERMANENT" })
        .select(SELECT_BASIC)
        .gt("price", 0)
        .or(`sale_ended_at.is.null,sale_ended_at.gte.${now}`)
        .order("likes_count", { ascending: false })
        .limit(limit * 3);

      if (error) {
        throw new Error(`Failed to fetch lip portfolios: ${error.message}`);
      }

      const rows = deduplicatePortfolios((data ?? []) as PortfolioRow[]);
      const mapped = secureShuffle(rows).slice(0, limit).map(mapPortfolioRow);
      return withAdInjection(mapped, (ids) => fetchAdPortfoliosByCategory(supabase, ids, LIP_CATEGORY_IDS));
    },
    ["home-lip-portfolios"],
    { revalidate: 60, tags: ["home", "portfolios"] },
  )();
}

export async function fetchEyebrowPortfolios(limit = 8): Promise<HomePortfolio[]> {
  return unstable_cache(
    async () => {
      const supabase = createStaticClient();
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .rpc("search_portfolios_by_category_ids", { p_category_ids: EYEBROW_CATEGORY_IDS, p_type_artist: "SEMI_PERMANENT" })
        .select(SELECT_BASIC)
        .gt("price", 0)
        .or(`sale_ended_at.is.null,sale_ended_at.gte.${now}`)
        .order("likes_count", { ascending: false })
        .limit(limit * 3);

      if (error) {
        throw new Error(`Failed to fetch eyebrow portfolios: ${error.message}`);
      }

      const rows = deduplicatePortfolios((data ?? []) as PortfolioRow[]);
      const mapped = secureShuffle(rows).slice(0, limit).map(mapPortfolioRow);
      return withAdInjection(mapped, (ids) => fetchAdPortfoliosByCategory(supabase, ids, EYEBROW_CATEGORY_IDS));
    },
    ["home-eyebrow-portfolios"],
    { revalidate: 60, tags: ["home", "portfolios"] },
  )();
}

// === Men's Eyebrow Portfolios (남자눈썹) ===

const MENS_EYEBROW_CATEGORY_IDS = [
  "88ef678a-bb80-4b65-87c4-79e5b503cf52", // 남자눈썹
];

export async function fetchMensEyebrowPortfolios(limit = 10): Promise<HomePortfolio[]> {
  return unstable_cache(
    async () => {
      const supabase = createStaticClient();
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .rpc("search_portfolios_by_category_ids", { p_category_ids: MENS_EYEBROW_CATEGORY_IDS, p_type_artist: "SEMI_PERMANENT" })
        .select(SELECT_BASIC)
        .gt("price", 0)
        .or(`sale_ended_at.is.null,sale_ended_at.gte.${now}`)
        .limit(limit * 5);

      if (error) {
        throw new Error(`Failed to fetch mens eyebrow portfolios: ${error.message}`);
      }

      const rows = deduplicatePortfolios((data ?? []) as PortfolioRow[]);
      const mapped = secureShuffle(rows).slice(0, limit).map(mapPortfolioRow);
      return withAdInjection(mapped, (ids) => fetchAdPortfoliosByCategory(supabase, ids, MENS_EYEBROW_CATEGORY_IDS));
    },
    ["home-mens-eyebrow-portfolios"],
    { revalidate: 30, tags: ["home", "portfolios"] },
  )();
}
