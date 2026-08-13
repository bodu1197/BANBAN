/**
 * 통합 검색(/api/search) 데이터 접근 — 라우트는 파싱·캐시 헤더만 담당하도록 분리했다
 * (형제 라우트 /api/portfolios/search 가 portfolio-search-queries 를 쓰는 것과 같은 구조).
 *
 * 예전에는 `portfolios.title ilike` 하나뿐이라 홈 인기검색어 칩을 눌러도 제목에 그 글자가 든
 * 작품만 나왔다(실측: "남자 눈썹" 7건, 정작 눈썹 카테고리엔 300건 이상). 지금은 제목·설명·카테고리
 * 세 경로를 합쳐 등급(제목 > 카테고리 > 설명)으로 정렬한다.
 */
import { unstable_cache } from "next/cache";
import { fetchSearchCategories } from "./category-queries";
import { createStaticClient } from "./server";
import { mapPortfolioRow, type PortfolioRowWithType, type HomePortfolio } from "./portfolio-common";
import { filterPublicPortfolios } from "./portfolio-visibility";
import { getAvatarUrl } from "./storage-utils";
import { escapeLikePattern } from "./query-utils";
import { getAdBoostContext, injectAdPortfolios } from "./boost-ranking";
import {
  matchCategoryIds,
  rankSearchCandidates,
  SEARCH_CANDIDATE_CAP,
  SEARCH_PAGE_SIZE,
  MIN_QUERY_LENGTH,
  MAX_QUERY_LENGTH,
  type SearchCandidate,
  type RankedCandidate,
} from "@/lib/search-match";

export interface GlobalSearchArtist {
  id: string;
  name: string;
  profileImage: string | null;
  region: string | null;
}

export interface GlobalSearchResult {
  portfolios: HomePortfolio[];
  artists: GlobalSearchArtist[];
  /** 매칭된 작품 총 수 — 이번 페이지에 보여준 개수가 아니라 실제 결과 수 */
  totalCount: number;
}

/** 아티스트 결과 상한 — 실측 최대 매칭이 9곳이라 사실상 전량. 탭 라벨의 숫자가 총계와 어긋나지 않는다 */
const ARTIST_RESULT_LIMIT = SEARCH_PAGE_SIZE;

const SELECT_PORTFOLIO = `
  id, artist_id, title, price_origin, price, discount_rate, sale_ended_at, likes_count,
  portfolio_media(storage_path, order_index),
  artist:artists!inner(title, address, profile_image_path, type_artist, is_hide, deleted_at, approved_at, status, portfolio_media_count, region:regions(name))
`;

/** 랭킹용 경량 select — 전체 컬럼·미디어를 수백 건씩 끌어오지 않는다. status 는 광고 적격 판정용. */
const SELECT_CANDIDATE =
  "id, artist_id, title, likes_count, artist:artists!inner(is_hide, deleted_at, approved_at, status, portfolio_media_count)";

type Client = ReturnType<typeof createStaticClient>;

interface CandidateRow {
  id: string;
  artist_id: string;
  title: string;
  likes_count: number | null;
  artist?: { status?: string | null } | null;
}

function logFailure(where: string, error: { message: string } | null): void {
  if (!error) return;
  // eslint-disable-next-line no-console -- error logging: 조용히 빈 결과가 되면 "결과 없음" 으로 위장된다
  console.error(`[global-search] ${where}: ${error.message}`);
}

function toCandidates(rows: CandidateRow[] | null): SearchCandidate[] {
  return (rows ?? []).map((r) => ({
    id: r.id,
    artistId: r.artist_id,
    title: r.title,
    likes: r.likes_count ?? 0,
    // 광고 적격은 active 전용 — 휴면(dormant) 샵은 승인 상태라 목록엔 남지만 광고 슬롯은 못 가진다
    artistActive: r.artist?.status === "active",
  }));
}

/** 판매 중인 것만 — 공개 여부는 filterPublicPortfolios(SSOT)가 담당하고 여기선 기간만 본다 */
function saleOpen<T extends { or: (f: string) => T }>(query: T): T {
  const now = new Date().toISOString();
  return query.or(`sale_ended_at.is.null,sale_ended_at.gte.${now}`);
}

/**
 * 제목/설명 각각의 후보. 설명까지 보는 이유: 시술명이 제목엔 없고 본문에만 적힌 작품이 많다
 * (실측: "리터치" 제목 4건, 설명에만 있는 것 20건).
 *
 * 컬럼별로 나눠 `.ilike()` 를 쓰는 이유: 한 번의 `.or()` 안에서는 와일드카드 이스케이프가 먹지 않아
 * 검색어 "%" 하나로 전체 작품이 반환된다(실측 1,276건). `.ilike()` 는 정상 이스케이프된다.
 */
async function fetchColumnCandidates(
  supabase: Client,
  column: "title" | "description",
  keyword: string,
): Promise<SearchCandidate[]> {
  const { data, error } = await saleOpen(
    filterPublicPortfolios(supabase.from("portfolios").select(SELECT_CANDIDATE)),
  )
    .ilike(column, `%${escapeLikePattern(keyword)}%`)
    // id 2차 정렬 — 상한에 걸려 잘릴 때 어떤 행이 남을지 결정적으로 만든다(달라지면 더보기 순서가 흔들린다)
    .order("likes_count", { ascending: false })
    .order("id", { ascending: true })
    .limit(SEARCH_CANDIDATE_CAP);
  logFailure(`${column} 후보`, error);
  return toCandidates(data as CandidateRow[] | null);
}

/**
 * 검색어와 이어지는 카테고리에 묶인 작품.
 * RPC 는 가시성·미디어수만 보고 가격/판매기간은 안 본다 → 텍스트 경로와 같은 기준이 되도록 여기서 덧건다
 * (portfolio-search-queries·home-portfolio-queries 도 같은 이유로 RPC 위에 두 필터를 붙인다).
 */
async function fetchCategoryCandidates(supabase: Client, keyword: string): Promise<SearchCandidate[]> {
  // 카테고리 목록 조회가 실패해도 제목·설명 매칭은 살아 있어야 한다(예전엔 그것만으로 검색했다)
  const categories = await fetchSearchCategories().catch((e: unknown) => {
    logFailure("카테고리 목록", { message: e instanceof Error ? e.message : String(e) });
    return [];
  });
  const categoryIds = matchCategoryIds(keyword, categories);
  if (categoryIds.length === 0) return [];

  const { data, error } = await saleOpen(
    supabase
      .rpc("search_portfolios_by_category_ids", { p_category_ids: categoryIds })
      .select("id, artist_id, title, likes_count, artist:artists!inner(status)")
      .gt("price", 0),
  )
    .order("likes_count", { ascending: false })
    .order("id", { ascending: true })
    .limit(SEARCH_CANDIDATE_CAP);
  logFailure("카테고리 후보", error);
  return toCandidates(data as CandidateRow[] | null);
}

/**
 * 랭킹으로 고른 id 만 전체 컬럼 조회 후 랭킹 순서대로 복원.
 * 공개 술어를 여기서 한 번 더 건다 — 후보 경로가 하나라도 게이트를 빠뜨리면 이 마지막 관문에서 걸린다.
 */
async function fetchPortfoliosInOrder(supabase: Client, ids: string[]): Promise<HomePortfolio[]> {
  if (ids.length === 0) return [];
  const { data, error } = await saleOpen(
    filterPublicPortfolios(supabase.from("portfolios").select(SELECT_PORTFOLIO)),
  ).in("id", ids);
  logFailure("본문 조회", error);
  const byId = new Map(
    ((data ?? []) as PortfolioRowWithType[]).map((row) => [row.id, mapPortfolioRow(row)]),
  );
  return ids.map((id) => byId.get(id)).filter((p): p is HomePortfolio => p !== undefined);
}

async function searchArtistsByKeyword(supabase: Client, keyword: string): Promise<GlobalSearchArtist[]> {
  const { data, error } = await supabase
    .from("artists")
    .select("id, title, profile_image_path, region:regions(name)")
    .is("deleted_at", null)
    .eq("is_hide", false)
    .eq("status", "active")
    .gte("portfolio_media_count", 5)
    .ilike("title", `%${escapeLikePattern(keyword)}%`)
    .order("likes_count", { ascending: false })
    .limit(ARTIST_RESULT_LIMIT);
  logFailure("아티스트", error);

  return (data ?? []).map((a: {
    id: string;
    title: string;
    profile_image_path: string | null;
    region: { name: string } | null;
  }) => ({
    id: a.id,
    name: a.title,
    // Storage 내부 경로(profile_image_path)를 avatars 버킷 public URL 로 변환.
    profileImage: getAvatarUrl(a.profile_image_path),
    region: a.region?.name ?? null,
  }));
}

/**
 * 광고 주입 — 첫 페이지에서만, 그리고 그 페이지 후보 안에서만 고른다.
 * 랭킹 밖(예: 500위) 작품을 끌어올리면 다음 페이지에서 광고 회전과 함께 사라져 "봤던 게 없어지는" 현상이 난다.
 */
function injectAds(
  page: HomePortfolio[],
  pageCandidates: ReadonlyArray<RankedCandidate>,
  adContext: { adArtistIds: string[]; slotIds: string[] },
): HomePortfolio[] {
  const { adArtistIds, slotIds } = adContext;
  if (adArtistIds.length === 0) return page;

  const adArtists = new Set(adArtistIds);
  const adIds = new Set(
    pageCandidates.filter((c) => c.artistActive && adArtists.has(c.artistId)).map((c) => c.id),
  );
  if (adIds.size === 0) return page;

  // 광고 후보는 이 페이지 안에서만 고르므로 이미 조회한 행을 그대로 쓴다(추가 왕복 없음).
  // injectAdPortfolios 는 중복을 제거하고 앞으로 끌어올리는 재정렬이라 페이지 길이가 변하지 않는다.
  return injectAdPortfolios(page, page.filter((p) => adIds.has(p.id)), slotIds, adArtistIds.length);
}

const EMPTY: GlobalSearchResult = { portfolios: [], artists: [], totalCount: 0 };

/** 랭킹 후보는 검색어당 한 번만 계산 — 더보기 페이지마다 ILIKE 풀스캔 3벌을 다시 돌리지 않는다 */
async function rankedCandidates(q: string): Promise<RankedCandidate[]> {
  const supabase = createStaticClient();
  const [title, description, category] = await Promise.all([
    fetchColumnCandidates(supabase, "title", q),
    fetchColumnCandidates(supabase, "description", q),
    fetchCategoryCandidates(supabase, q),
  ]);
  return rankSearchCandidates(q, { title, category, description });
}

const cachedRankedCandidates = unstable_cache(rankedCandidates, ["global-search-ranked"], {
  revalidate: 60,
  tags: ["portfolios"],
});

/** 캐시 키 정규화 — "눈썹" / " 눈썹 " / "눈썹 " 이 각각 엔트리를 만들지 않게 */
function cacheKey(q: string): string {
  return q.toLowerCase().replace(/\s+/g, " ").trim();
}

/** offset 상한 — 후보 상한(3경로 × CAP)을 넘으면 어차피 빈 페이지다 */
export const MAX_SEARCH_OFFSET = SEARCH_CANDIDATE_CAP * 3;

/** 통합 검색 — 제목·설명·카테고리 합집합을 등급순으로 페이지 단위 반환 */
export async function globalSearch(
  keyword: string,
  offset: number,
  limit: number,
): Promise<GlobalSearchResult> {
  const q = keyword.trim().slice(0, MAX_QUERY_LENGTH);
  if (q.length < MIN_QUERY_LENGTH) return EMPTY;

  const supabase = createStaticClient();
  const firstPage = offset === 0;
  // 아티스트·광고는 첫 페이지에서만 쓰인다 — 매 페이지 조회하면 결과를 버리면서 왕복만 늘린다
  const [ranked, artists, adContext] = await Promise.all([
    cachedRankedCandidates(cacheKey(q)),
    firstPage ? searchArtistsByKeyword(supabase, q) : Promise.resolve([]),
    firstPage ? getAdBoostContext() : Promise.resolve(null),
  ]);

  const pageCandidates = ranked.slice(offset, offset + limit);
  const page = await fetchPortfoliosInOrder(supabase, pageCandidates.map((c) => c.id));

  // 광고는 첫 페이지에만 — 페이지마다 주입하면 더보기 때 상단이 갈아끼워진다
  const portfolios = adContext ? injectAds(page, pageCandidates, adContext) : page;

  return { portfolios, artists, totalCount: ranked.length };
}
