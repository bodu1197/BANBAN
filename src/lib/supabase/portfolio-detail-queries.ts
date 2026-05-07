import { cache } from "react";
import { createClient } from "./server";
import { getStorageUrl } from "./storage-utils";
import type { Artist, Portfolio, PortfolioMedia, Region } from "@/types/database";
import { secureShuffle } from "@/lib/random";

type SupabaseInstance = Awaited<ReturnType<typeof createClient>>;

// === Local type aliases (avoid circular import with queries.ts) ===

interface ArtistMediaRow {
  id: string;
  storage_path: string;
  type: 'image' | 'video';
  order_index: number;
}

interface ArtistWithDetailsLocal extends Artist {
  region?: Region | null;
  portfolioImage?: string | null;
  profileImage?: string | null;
  artist_media?: ArtistMediaRow[];
}

interface PortfolioWithMediaLocal extends Portfolio {
  portfolio_media: PortfolioMedia[];
}

// === Portfolio Detail Types ===

export interface PortfolioDetails extends Portfolio {
  artist: ArtistWithDetailsLocal;
  portfolio_media: PortfolioMedia[];
  is_liked?: boolean; // Virtual field for UI
}

export interface PortfolioRecommendation extends Portfolio {
  portfolio_media: PortfolioMedia[];
  artist: {
    type_artist?: 'SEMI_PERMANENT';
    region?: { name: string } | null;
  };
}

type ArtistType = 'SEMI_PERMANENT';

// Common select clause for portfolio recommendations
const PORTFOLIO_RECOMMENDATION_SELECT = `*, portfolio_media(*), artist:artists(type_artist, region:regions(name))`;

interface RecommendationContext {
  supabase: SupabaseInstance;
  artistIds: string[];
}

/**
 * Initialize recommendation context with artist IDs by type
 */
const initRecommendationContext = cache(async function initRecommendationContext(artistType: ArtistType): Promise<RecommendationContext | null> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types yet
  const { data } = await (supabase as any).rpc("get_recommendation_artist_ids", { p_type_artist: artistType });
  const artistIds = ((data ?? []) as Array<{ artist_id: string }>).map((a) => a.artist_id);
  return artistIds.length > 0 ? { supabase, artistIds } : null;
});

type PriceComparison = 'lower' | 'higher';

/**
 * Transform portfolio media URLs
 */
function transformPortfolioMedia(portfolios: PortfolioRecommendation[]): PortfolioRecommendation[] {
  return portfolios.map((portfolio) => ({
    ...portfolio,
    portfolio_media: (portfolio.portfolio_media ?? []).map((media) => ({
      ...media,
      storage_path: getStorageUrl(media.storage_path) ?? media.storage_path,
    })),
  }));
}

/**
 * Fetch a single portfolio by ID with full details
 */
export const fetchPortfolioById = cache(async function fetchPortfolioById(
  id: string
): Promise<PortfolioDetails | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("portfolios")
    .select(`
      *,
      portfolio_media(*),
      artist:artists(*, region:regions(*))
    `)
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    // eslint-disable-next-line no-console
    console.error(`Failed to fetch portfolio: ${error.message}`);
    return null;
  }

  const portfolio = data as unknown as PortfolioDetails;

  if (portfolio.portfolio_media) {
    portfolio.portfolio_media = portfolio.portfolio_media.map((media) => ({
      ...media,
      storage_path: getStorageUrl(media.storage_path) ?? media.storage_path,
    }));
  }

  return portfolio;
});

/**
 * Fetch portfolios for an artist
 */
export async function fetchPortfoliosByArtist(
  artistId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ data: PortfolioWithMediaLocal[]; count: number }> {
  const { limit = 20, offset = 0 } = options;
  const supabase = await createClient();

  const { data, error, count } = await supabase
    .from("portfolios")
    .select(`*, portfolio_media(*)`, { count: "exact" })
    .eq("artist_id", artistId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to fetch portfolios: ${error.message}`);
    return { data: [], count: 0 };
  }

  const portfolios = (data ?? []) as unknown as PortfolioWithMediaLocal[];

  const portfoliosWithUrls = portfolios.map((portfolio) => ({
    ...portfolio,
    portfolio_media: portfolio.portfolio_media.map((media) => ({
      ...media,
      storage_path: getStorageUrl(media.storage_path) ?? media.storage_path,
    })),
  }));

  return {
    data: portfoliosWithUrls,
    count: count ?? 0,
  };
}

/**
 * Fetch recommended portfolios by price range
 */
async function fetchPortfoliosByPriceRange(
  currentPrice: number,
  excludeId: string,
  artistType: ArtistType,
  comparison: PriceComparison,
  limit: number
): Promise<PortfolioRecommendation[]> {
  const ctx = await initRecommendationContext(artistType);
  if (!ctx) return [];

  let query = ctx.supabase.from("portfolios").select(PORTFOLIO_RECOMMENDATION_SELECT);

  query = comparison === 'lower'
    ? query.lt("price", currentPrice).order("price", { ascending: false })
    : query.gt("price", currentPrice).order("price", { ascending: true });

  const now = new Date().toISOString();
  const { data, error } = await query
    .neq("id", excludeId)
    .in("artist_id", ctx.artistIds)
    .is("deleted_at", null)
    .gt("price", 0)
    .or(`sale_ended_at.is.null,sale_ended_at.gte.${now}`)
    .limit(limit);

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to fetch ${comparison} price portfolios: ${error.message}`);
    return [];
  }
  return transformPortfolioMedia(data as PortfolioRecommendation[]);
}

/** Fetch recommended portfolios by price range (lower than current) */
export function fetchLowerPricePortfolios(
  currentPrice: number, excludeId: string, artistType: ArtistType, limit = 5
): Promise<PortfolioRecommendation[]> {
  return fetchPortfoliosByPriceRange(currentPrice, excludeId, artistType, 'lower', limit);
}

/** Fetch recommended portfolios by price range (higher than current) */
export function fetchHigherPricePortfolios(
  currentPrice: number, excludeId: string, artistType: ArtistType, limit = 5
): Promise<PortfolioRecommendation[]> {
  return fetchPortfoliosByPriceRange(currentPrice, excludeId, artistType, 'higher', limit);
}

/**
 * Fetch random portfolios (for "other customers viewed" and "style suggestions")
 */
export async function fetchRandomPortfolios(
  excludeId: string, artistType: ArtistType, limit = 5
): Promise<PortfolioRecommendation[]> {
  const ctx = await initRecommendationContext(artistType);
  if (!ctx) return [];

  const now = new Date().toISOString();
  const { data, error } = await ctx.supabase
    .from("portfolios")
    .select(PORTFOLIO_RECOMMENDATION_SELECT)
    .neq("id", excludeId)
    .in("artist_id", ctx.artistIds)
    .is("deleted_at", null)
    .gt("price", 0)
    .or(`sale_ended_at.is.null,sale_ended_at.gte.${now}`)
    .order("views_count", { ascending: false })
    .limit(50);

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to fetch random portfolios: ${error.message}`);
    return [];
  }
  const shuffled = secureShuffle(data ?? []);
  return transformPortfolioMedia(shuffled.slice(0, limit) as PortfolioRecommendation[]);
}

/**
 * Fetch portfolios with same categories (body part, style)
 */
export async function fetchSameCategoryPortfolios(
  portfolioId: string,
  artistType: ArtistType,
  limit = 5
): Promise<PortfolioRecommendation[]> {
  const ctx = await initRecommendationContext(artistType);
  if (!ctx) return [];

  const { data: categories } = await ctx.supabase
    .from("categorizables")
    .select("category_id")
    .eq("categorizable_type", "portfolio")
    .eq("categorizable_id", portfolioId);

  const typedCategories = categories as Array<{ category_id: string }> | null;
  if (!typedCategories || typedCategories.length === 0) {
    return fetchRandomPortfolios(portfolioId, artistType, limit);
  }

  const { data: sameCategory } = await ctx.supabase
    .from("categorizables")
    .select("categorizable_id")
    .eq("categorizable_type", "portfolio")
    .in("category_id", typedCategories.map(c => c.category_id))
    .neq("categorizable_id", portfolioId)
    .limit(limit * 2);

  const typedSameCategory = sameCategory as Array<{ categorizable_id: string }> | null;
  if (!typedSameCategory || typedSameCategory.length === 0) {
    return fetchRandomPortfolios(portfolioId, artistType, limit);
  }

  const portfolioIds = [...new Set(typedSameCategory.map(c => c.categorizable_id))].slice(0, limit);

  const nowStr = new Date().toISOString();
  const { data, error } = await ctx.supabase
    .from("portfolios")
    .select(PORTFOLIO_RECOMMENDATION_SELECT)
    .in("id", portfolioIds)
    .in("artist_id", ctx.artistIds)
    .is("deleted_at", null)
    .gt("price", 0)
    .or(`sale_ended_at.is.null,sale_ended_at.gte.${nowStr}`);

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to fetch same category portfolios: ${error.message}`);
    return [];
  }
  return transformPortfolioMedia(data as PortfolioRecommendation[]);
}

/**
 * Fetch all categories (for artist registration/edit forms)
 */
export async function fetchAllCategories(): Promise<Array<{ id: string; name: string; category_type: string | null }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, category_type")
    .order("order_index", { ascending: true });

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to fetch categories: ${error.message}`);
    return [];
  }
  return (data ?? []) as Array<{ id: string; name: string; category_type: string | null }>;
}
