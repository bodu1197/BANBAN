import { unstable_cache } from "next/cache";
import { createStaticClient } from "./server";
import { MIN_PORTFOLIO_MEDIA } from "./artist-visibility";
import { ITEMS_PER_PAGE } from "@/lib/sitemap-utils";
import { withAdInjection } from "./boost-ranking";
import { fetchAdPortfoliosGeneric } from "./home-portfolio-queries";
import { mapPortfolioRow, type PortfolioRow, type HomePortfolio } from "./portfolio-common";

/** 목록 페이지당 카드 수 — 2·3·4열 그리드에 균등하게 나뉘는 24. */
export const LISTING_PAGE_SIZE = 24;

/** 목록/카운트 캐시 TTL(초). page.tsx revalidate, sitemap s-maxage 과 의미상 동일 계층. */
const LISTING_CACHE_TTL = 300;

const SELECT_PUBLIC = `
  id, artist_id, title, price_origin, price, discount_rate, sale_ended_at, likes_count,
  portfolio_media(storage_path, order_index),
  artist:artists!inner(title, address, profile_image_path, region:regions(name))
`;

/** page 파라미터 정규화 SSOT — 비수치(abc)·비정수(2.5)·음수·0 을 모두 1 이상 정수로. */
export function normalizePage(value: unknown): number {
  return Math.max(1, Math.trunc(Number(value)) || 1);
}

/**
 * 공개 포폴 술어 SSOT — 목록/사이트맵/카운트가 **반드시 이 함수를 공유**한다.
 * 사이트맵 URL = 목록에서 링크되는 URL = 공개 상세, 세 집합이 일치해야 크롤이 색인으로 이어진다.
 *
 * 공개 정의: 승인 완료(approved_at NOT NULL = active/dormant) + 미숨김 + 미삭제 아티스트,
 * 미디어 ≥ MIN_PORTFOLIO_MEDIA, 삭제 안 된 유가(price>0) 포폴.
 *
 * ⚠️ 모든 호출부는 select 에 `artist:artists!inner(...)` 임베드를 포함해야 한다 —
 * 없으면 아래 artist.* 필터가 부모(portfolios)를 못 걸러 비공개 포폴이 조용히 노출된다(A01).
 * (참고: 광고 부스트는 media≥5 를 면제하므로 filterPublicPortfolios 가 아니라
 *  fetchAdPortfoliosGeneric 의 isAdEligibleArtist 로 별도 처리된다.)
 */
export function filterPublicPortfolios<
  T extends {
    is(column: string, value: null): T;
    not(column: string, operator: "is", value: null): T;
    eq(column: string, value: boolean): T;
    gt(column: string, value: number): T;
    gte(column: string, value: number): T;
  },
>(query: T): T {
  return query
    .is("deleted_at", null)
    .gt("price", 0)
    .not("artist.approved_at", "is", null)
    .eq("artist.is_hide", false)
    .is("artist.deleted_at", null)
    .gte("artist.portfolio_media_count", MIN_PORTFOLIO_MEDIA);
}

export interface PublicPortfolioPage {
  items: HomePortfolio[];
  total: number;
  totalPages: number;
}

/**
 * 공개 포폴 총 개수 — 전 페이지가 공유하는 **단일** 캐시(anon client, 본문과 동일 술어).
 * 페이지별 캐시에 넣으면 봇이 전 페이지 순회 시 동일 풀카운트를 페이지 수만큼 반복하므로 분리.
 * 사이트맵 인덱스(sitemap.xml)도 이 함수를 써서 인덱스 count = 본문 출력을 같은 client 로 보장.
 */
async function fetchPublicPortfolioTotal(): Promise<number> {
  return unstable_cache(
    async (): Promise<number> => {
      const supabase = createStaticClient();
      const { count, error } = await filterPublicPortfolios(
        supabase.from("portfolios").select("id, artist:artists!inner(id)", { count: "exact", head: true }),
      );
      if (error) throw new Error(`Failed to count public portfolios: ${error.message}`);
      return count ?? 0;
    },
    ["public-portfolio-total"],
    { revalidate: LISTING_CACHE_TTL, tags: ["portfolios"] },
  )();
}

export { fetchPublicPortfolioTotal as countPublicPortfolios };

/** 한 페이지분 자연(비광고) 공개 포폴 — 페이지별 캐시. 광고 주입은 캐시 밖에서(60s 회전). */
async function fetchNaturalPortfolioItems(safePage: number): Promise<HomePortfolio[]> {
  return unstable_cache(
    async (): Promise<HomePortfolio[]> => {
      const supabase = createStaticClient();
      const from = (safePage - 1) * LISTING_PAGE_SIZE;
      const { data, error } = await filterPublicPortfolios(
        supabase.from("portfolios").select(SELECT_PUBLIC),
      )
        .order("created_at", { ascending: false })
        .range(from, from + LISTING_PAGE_SIZE - 1);

      if (error) throw new Error(`Failed to fetch public portfolio page: ${error.message}`);
      // SELECT_PUBLIC 은 비리터럴 문자열 → Supabase 가 shape 추론 불가 → PortfolioRow 로 브리지.
      return ((data ?? []) as unknown as PortfolioRow[]).map(mapPortfolioRow);
    },
    [`public-portfolio-items-${safePage}`],
    { revalidate: LISTING_CACHE_TTL, tags: ["portfolios"] },
  )();
}

/** 공개 포폴 한 페이지(최신순) + 전체 개수. 1페이지 상단에만 유료 광고 부스트 주입. */
export async function fetchPublicPortfolioPage(page: number): Promise<PublicPortfolioPage> {
  const safePage = normalizePage(page);
  const total = await fetchPublicPortfolioTotal();
  const totalPages = Math.max(1, Math.ceil(total / LISTING_PAGE_SIZE));

  // 범위 초과 페이지는 빈 결과 — 호출측(renderPortfoliosPage)이 page>totalPages 를 notFound 처리.
  if ((safePage - 1) * LISTING_PAGE_SIZE >= total) {
    return { items: [], total, totalPages };
  }

  const natural = await fetchNaturalPortfolioItems(safePage);

  // 1페이지 상단에만 광고 주입 — 기존 /portfolios 동작 유지. 광고는 60s 회전이라 페이지 캐시 밖.
  const items =
    safePage === 1
      ? await withAdInjection(natural, (adIds) =>
          fetchAdPortfoliosGeneric(createStaticClient(), adIds, (q) => q.order("created_at", { ascending: false })),
        )
      : natural;

  return { items, total, totalPages };
}

/** 사이트맵 한 페이지분 공개 포폴 id — 목록과 동일 술어. 페이지 크기는 인덱스와 같은 ITEMS_PER_PAGE. */
export async function fetchPublicPortfolioSitemapRows(
  page: number,
): Promise<Array<{ id: string; updated_at: string | null }>> {
  const safePage = normalizePage(page);
  const total = await fetchPublicPortfolioTotal();

  // 범위 초과면 빈 urlset — PostgREST range 416(→500) 원천 차단.
  if ((safePage - 1) * ITEMS_PER_PAGE >= total) return [];

  const supabase = createStaticClient();
  const from = (safePage - 1) * ITEMS_PER_PAGE;
  const { data, error } = await filterPublicPortfolios(
    // artist!inner 임베드가 있어야 filterPublicPortfolios 의 artist.* 조인 필터가 적용된다.
    supabase.from("portfolios").select("id, updated_at, artist:artists!inner(id)"),
  )
    .order("created_at", { ascending: true })
    .range(from, from + ITEMS_PER_PAGE - 1);

  if (error) throw new Error(`Failed to fetch portfolio sitemap rows: ${error.message}`);
  return (data ?? []) as Array<{ id: string; updated_at: string | null }>;
}
