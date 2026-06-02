import { NextResponse, type NextRequest } from "next/server";
import { createStaticClient } from "@/lib/supabase/server";
import { mapPortfolioRow, type PortfolioRowWithType } from "@/lib/supabase/portfolio-common";
import type { HomePortfolio } from "@/lib/supabase/portfolio-common";
import { getAvatarUrl } from "@/lib/supabase/storage-utils";
import { escapeLikePattern } from "@/lib/supabase/query-utils";
import { withAdInjection, AD_INJECTION_FETCH_LIMIT } from "@/lib/supabase/boost-ranking";

interface ArtistResult {
  id: string;
  name: string;
  profileImage: string | null;
  region: string | null;
  portfolioCount: number;
}

interface SearchResponse {
  portfolios: HomePortfolio[];
  artists: ArtistResult[];
}

const SELECT_PORTFOLIO = `
  id, artist_id, title, price_origin, price, discount_rate, sale_ended_at, likes_count,
  portfolio_media(storage_path, order_index),
  artist:artists!inner(title, address, profile_image_path, type_artist, is_hide, deleted_at, region:regions(name))
`;

// 키워드 포폴 검색 — adArtistIds 를 주면 "광고 주입용"(활성 샵 + 광고 회원 한정), 아니면 일반 검색.
// 공통 필터(가시성·판매중·title ilike)를 한 함수로 묶어 자연/광고 쿼리 중복 제거.
async function searchPortfoliosByKeyword(
  supabase: ReturnType<typeof createStaticClient>,
  keyword: string,
  opts: { limit: number; adArtistIds?: string[] },
): Promise<HomePortfolio[]> {
  const now = new Date().toISOString();
  let q = supabase
    .from("portfolios")
    .select(SELECT_PORTFOLIO)
    .is("deleted_at", null)
    .gt("price", 0)
    .or(`sale_ended_at.is.null,sale_ended_at.gte.${now}`)
    .is("artists.deleted_at", null)
    .eq("artists.is_hide", false)
    .ilike("title", `%${escapeLikePattern(keyword)}%`);

  // 광고 주입용: 휴면 샵 광고 제외(status=active) + 광고 회원으로 한정
  if (opts.adArtistIds) {
    q = q.eq("artists.status", "active").in("artist_id", opts.adArtistIds);
  }

  const { data } = await q.order("likes_count", { ascending: false }).limit(opts.limit);
  return ((data ?? []) as PortfolioRowWithType[]).map(mapPortfolioRow);
}

async function searchArtistsByKeyword(
  supabase: ReturnType<typeof createStaticClient>,
  keyword: string,
  limit: number,
): Promise<ArtistResult[]> {
  const { data } = await supabase
    .from("artists")
    .select("id, title, profile_image_path, region:regions(name), portfolios(id)")
    .is("deleted_at", null)
    .eq("is_hide", false)
    .eq("status", "active")
    .ilike("title", `%${escapeLikePattern(keyword)}%`)
    .order("likes_count", { ascending: false })
    .limit(limit);

  return (data ?? []).map((a: {
    id: string;
    title: string;
    profile_image_path: string | null;
    region: { name: string } | null;
    portfolios: { id: string }[];
  }) => ({
    id: a.id,
    name: a.title,
    // Storage 내부 경로(profile_image_path)를 avatars 버킷 public URL 로 변환.
    // 다른 곳(home-artist-queries, portfolio-common)은 이미 getAvatarUrl 거치는데 여기만 누락이었음.
    profileImage: getAvatarUrl(a.profile_image_path),
    region: a.region?.name ?? null,
    portfolioCount: a.portfolios?.length ?? 0,
  }));
}

// Public read-only 검색 — 60초 CDN/Vercel Data Cache + stale-while-revalidate 로 latency 단축.
const SEARCH_CACHE_TTL = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ portfolios: [], artists: [] });
  }

  const supabase = createStaticClient();

  const [portfolios, artists] = await Promise.all([
    searchPortfoliosByKeyword(supabase, q, { limit: 24 }),
    searchArtistsByKeyword(supabase, q, 12),
  ]);

  const boostedPortfolios = await withAdInjection(portfolios, (adIds) =>
    searchPortfoliosByKeyword(supabase, q, { limit: AD_INJECTION_FETCH_LIMIT, adArtistIds: adIds }),
  );

  const response: SearchResponse = {
    portfolios: boostedPortfolios,
    artists,
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": `public, s-maxage=${SEARCH_CACHE_TTL}, stale-while-revalidate=120` },
  });
}
