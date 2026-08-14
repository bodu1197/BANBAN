import { unstable_cache } from "next/cache";
import { createStaticClient } from "./server";
import { filterPublicPortfolios } from "./portfolio-visibility";
import { ITEMS_PER_PAGE } from "@/lib/sitemap-utils";
import { withAdInjection } from "./boost-ranking";
import { fetchAdPortfoliosGeneric } from "./home-portfolio-queries";
import { mapPortfolioRow, type PortfolioRow, type HomePortfolio } from "./portfolio-common";

/** 목록 페이지당 카드 수 — 2·3·4열 그리드에 균등하게 나뉘는 24. */
export const LISTING_PAGE_SIZE = 24;

/** 목록/카운트 캐시 TTL(초). page.tsx revalidate, sitemap s-maxage 과 의미상 동일 계층. */
const LISTING_CACHE_TTL = 300;

/**
 * 목록(1페이지 + /page/N) 전용 무효화 태그.
 *
 * 예전엔 `"portfolios"` 를 썼는데 그 태그는 홈 6개 섹션·`/discount`·전역검색 캐시까지 달고 있어
 * 작품 1건 수정이 그 전부를 콜드로 만들었다. 그쪽은 30~60초 TTL 이라 어차피 스스로 만료된다.
 */
export const LISTING_CACHE_TAG = "portfolio-listing";

const SELECT_PUBLIC = `
  id, artist_id, title, price_origin, price, discount_rate, sale_ended_at, likes_count,
  portfolio_media(storage_path, order_index),
  artist:artists!inner(title, address, profile_image_path, region:regions(name))
`;

/** page 파라미터 정규화 SSOT — 비수치(abc)·비정수(2.5)·음수·0 을 모두 1 이상 정수로. */
export function normalizePage(value: unknown): number {
  return Math.max(1, Math.trunc(Number(value)) || 1);
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
    { revalidate: LISTING_CACHE_TTL, tags: [LISTING_CACHE_TAG] },
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
    { revalidate: LISTING_CACHE_TTL, tags: [LISTING_CACHE_TAG] },
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
