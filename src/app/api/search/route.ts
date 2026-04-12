import { NextResponse, type NextRequest } from "next/server";
import { createStaticClient } from "@/lib/supabase/server";
import { mapPortfolioRow, type PortfolioRowWithType } from "@/lib/supabase/portfolio-common";
import type { HomePortfolio } from "@/lib/supabase/portfolio-common";

interface ArtistResult {
  id: string;
  name: string;
  profileImage: string | null;
  region: string | null;
  portfolioCount: number;
  isAd: boolean;
}

interface SearchResponse {
  portfolios: HomePortfolio[];
  artists: ArtistResult[];
  adArtistIds: string[];
  adPortfolioIds: string[];
}

const SELECT_PORTFOLIO = `
  id, artist_id, title, price_origin, price, discount_rate, sale_ended_at, likes_count,
  portfolio_media(storage_path, order_index),
  artist:artists!inner(title, address, profile_image_path, type_artist, is_hide, deleted_at, region:regions(name))
`;

interface AdInfo { artistIds: Set<string>; artistIdsNoSlots: Set<string>; portfolioIds: Set<string> }

async function fetchActiveAdInfo(supabase: ReturnType<typeof createStaticClient>): Promise<AdInfo> {
  const now = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("ad_subscriptions")
    .select("artist_id, slots:ad_portfolio_slots(portfolio_id)")
    .eq("status", "ACTIVE")
    .gt("expires_at", now);

  const rows = (data ?? []) as { artist_id: string; slots: { portfolio_id: string }[] }[];
  const artistIds = new Set(rows.map(r => r.artist_id));
  const artistIdsNoSlots = new Set(rows.filter(r => r.slots.length === 0).map(r => r.artist_id));
  const portfolioIds = new Set(rows.flatMap(r => r.slots.map(s => s.portfolio_id)));
  return { artistIds, artistIdsNoSlots, portfolioIds };
}

async function searchPortfoliosByKeyword(
  supabase: ReturnType<typeof createStaticClient>,
  keyword: string,
  limit: number,
): Promise<HomePortfolio[]> {
  const now = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("portfolios")
    .select(SELECT_PORTFOLIO)
    .is("deleted_at", null)
    .gt("price", 0)
    .or(`sale_ended_at.is.null,sale_ended_at.gte.${now}`)
    .is("artists.deleted_at", null)
    .eq("artists.is_hide", false)
    .ilike("title", `%${keyword}%`)
    .order("likes_count", { ascending: false })
    .limit(limit);

  return ((data ?? []) as PortfolioRowWithType[]).map(mapPortfolioRow);
}

async function searchArtistsByKeyword(
  supabase: ReturnType<typeof createStaticClient>,
  keyword: string,
  limit: number,
): Promise<ArtistResult[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("artists")
    .select("id, title, profile_image_path, region:regions(name), portfolios(id)")
    .is("deleted_at", null)
    .eq("is_hide", false)
    .eq("status", "active")
    .ilike("title", `%${keyword}%`)
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
    profileImage: a.profile_image_path,
    region: a.region?.name ?? null,
    portfolioCount: a.portfolios?.length ?? 0,
    isAd: false,
  }));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ portfolios: [], artists: [], adArtistIds: [] });
  }

  const supabase = createStaticClient();

  const [portfolios, artists, adInfo] = await Promise.all([
    searchPortfoliosByKeyword(supabase, q, 24),
    searchArtistsByKeyword(supabase, q, 12),
    fetchActiveAdInfo(supabase),
  ]);

  // Mark ad artists
  const artistsWithAd = artists.map(a => ({ ...a, isAd: adInfo.artistIds.has(a.id) }));

  // Check if portfolio is an ad: either in slot list, or artist has no slots but has active ad
  const isAdPortfolio = (p: HomePortfolio): boolean =>
    adInfo.portfolioIds.has(p.id) || adInfo.artistIdsNoSlots.has(p.artistId);

  // Sort: ad portfolios first, then by likes
  const adPortfolios = portfolios.filter(isAdPortfolio);
  const normalPortfolios = portfolios.filter(p => !isAdPortfolio(p));
  const sortedPortfolios = [...adPortfolios, ...normalPortfolios];

  // Sort: ad artists first
  const adArtists = artistsWithAd.filter(a => a.isAd);
  const normalArtists = artistsWithAd.filter(a => !a.isAd);
  const sortedArtists = [...adArtists, ...normalArtists];

  const response: SearchResponse = {
    portfolios: sortedPortfolios,
    artists: sortedArtists,
    adArtistIds: [...adInfo.artistIdsNoSlots],
    adPortfolioIds: [...adInfo.portfolioIds],
  };

  return NextResponse.json(response);
}
