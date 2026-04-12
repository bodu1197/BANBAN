/**
 * Core queries — re-export barrel for backward compatibility.
 *
 * Actual implementations live in:
 *   - storage-utils.ts           (getStorageUrl, getAvatarUrl, getArtistMediaUrl)
 *   - portfolio-detail-queries.ts (portfolio detail, recommendations, categories)
 *
 * Artist-related queries that were here remain inline below (fetchArtists,
 * fetchArtistById, searchArtists, fetchRegions, fetchReviewsByArtist).
 */

import { cache } from "react";
import { createClient } from "./server";
import { getStorageUrl } from "./storage-utils";
import type { Artist, Portfolio, PortfolioMedia, Region, Review } from "@/types/database";

// Re-export storage utilities for backward compatibility
export { getStorageUrl, getAvatarUrl } from "./storage-utils";
export { getArtistMediaUrl } from "./storage-utils";

// Re-export portfolio detail queries for backward compatibility
export type { PortfolioDetails, PortfolioRecommendation } from "./portfolio-detail-queries";
export {
  fetchPortfolioById,
  fetchPortfoliosByArtist,
  fetchLowerPricePortfolios,
  fetchHigherPricePortfolios,
  fetchRandomPortfolios,
  fetchSameCategoryPortfolios,
  fetchAllCategories,
} from "./portfolio-detail-queries";

type SupabaseInstance = Awaited<ReturnType<typeof createClient>>;

/**
 * Get artist IDs that have at least one portfolio (via DB RPC)
 */
export async function getArtistIdsWithPortfolio(
  supabase: SupabaseInstance,
): Promise<Set<string>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types yet
  const { data } = await (supabase as any).rpc("get_artist_ids_with_portfolio");
  const ids = new Set<string>();
  for (const row of (data ?? []) as Array<{ artist_id: string }>) {
    ids.add(row.artist_id);
  }
  return ids;
}

// === Artist Types ===

interface ArtistMediaRow {
  id: string;
  storage_path: string;
  type: 'image' | 'video';
  order_index: number;
}

export interface ArtistWithDetails extends Artist {
  region?: Region | null;
  portfolioImage?: string | null;
  profileImage?: string | null;
  artist_media?: ArtistMediaRow[];
}

interface ArtistQueryResult extends Artist {
  region: Region | null;
}

/**
 * Portfolio with media
 */
export interface PortfolioWithMedia extends Portfolio {
  portfolio_media: PortfolioMedia[];
}

/**
 * Review with user profile info
 */
export interface ReviewWithUser extends Review {
  profile?: { nickname: string } | null;
}

// === Internal Helpers ===

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function buildArtistListQuery(
  supabase: SupabaseInstance,
  offset: number,
  limit: number,
) {
  return supabase
    .from("artists")
    .select(`*, region:regions(*)`, { count: "exact" })
    .is("deleted_at", null)
    .eq("is_hide", false)
    .eq("status", "active")
    .order("likes_count", { ascending: false })
    .range(offset, offset + limit - 1);
}

async function mapArtistsWithImages(
  supabase: SupabaseInstance,
  artists: ArtistQueryResult[],
): Promise<ArtistWithDetails[]> {
  if (artists.length === 0) return [];

  const artistIds = artists.map((a) => a.id);
  const { data: portfolios } = await supabase
    .from("portfolios")
    .select("artist_id, portfolio_media(storage_path, order_index)")
    .in("artist_id", artistIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const imageByArtist = new Map<string, string | null>();
  for (const p of (portfolios ?? []) as Array<{ artist_id: string; portfolio_media: Array<{ storage_path: string; order_index: number }> }>) {
    if (imageByArtist.has(p.artist_id)) continue;
    const firstMedia = p.portfolio_media?.[0];
    imageByArtist.set(p.artist_id, firstMedia ? getStorageUrl(firstMedia.storage_path) : null);
  }

  return artists.map((artist) => ({
    ...artist,
    portfolioImage: imageByArtist.get(artist.id) ?? null,
  }));
}

async function processArtistListResult(
  supabase: SupabaseInstance,
  result: { data: unknown; error: { message: string } | null; count: number | null },
  label: string,
): Promise<{ data: ArtistWithDetails[]; count: number }> {
  if (result.error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to ${label}: ${result.error.message}`);
    return { data: [], count: 0 };
  }
  return {
    data: await mapArtistsWithImages(supabase, (result.data ?? []) as ArtistQueryResult[]),
    count: result.count ?? 0,
  };
}

// === Public API: Artists ===

/**
 * Fetch artists with optional filtering
 */
export async function fetchArtists(options: {
  limit?: number;
  offset?: number;
  regionId?: string | null;
  typeArtist?: "TATTOO" | "SEMI_PERMANENT";
}): Promise<{ data: ArtistWithDetails[]; count: number }> {
  const { limit = 24, offset = 0, regionId, typeArtist } = options;
  const supabase = await createClient();

  let query = buildArtistListQuery(supabase, offset, limit);

  if (regionId) {
    query = query.eq("region_id", regionId);
  }

  if (typeArtist) {
    query = query.or(`type_artist.eq.${typeArtist},type_artist.eq.BOTH`);
  }

  return processArtistListResult(supabase, await query, "fetch artists");
}

/**
 * Fetch a single artist by ID
 */
export const fetchArtistById = cache(async function fetchArtistById(
  id: string
): Promise<ArtistWithDetails | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("artists")
    .select(
      `
      *,
      region:regions(*),
      artist_media(id, storage_path, type, order_index)
    `
    )
    .eq("id", id)
    .is("deleted_at", null)
    .eq("status", "active")
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    // eslint-disable-next-line no-console
    console.error(`Failed to fetch artist: ${error.message}`);
    return null;
  }

  return data;
});

/**
 * Fetch all regions
 */
export async function fetchRegions(): Promise<Region[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("regions")
    .select("*")
    .order("order_index", { ascending: true });

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to fetch regions: ${error.message}`);
    return [];
  }

  return data ?? [];
}

/**
 * Search artists by query text, region, or genre
 */
export async function searchArtists(options: {
  query?: string;
  regionId?: string | null;
  limit?: number;
  offset?: number;
}): Promise<{ data: ArtistWithDetails[]; count: number }> {
  const { query, regionId, limit = 24, offset = 0 } = options;
  const supabase = await createClient();

  let dbQuery = buildArtistListQuery(supabase, offset, limit);

  if (query) {
    dbQuery = dbQuery.or(`title.ilike.%${query}%,address.ilike.%${query}%`);
  }

  if (regionId) {
    dbQuery = dbQuery.eq("region_id", regionId);
  }

  return processArtistListResult(supabase, await dbQuery, "search artists");
}

/**
 * Fetch reviews for an artist
 */
export async function fetchReviewsByArtist(
  artistId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ data: ReviewWithUser[]; count: number }> {
  const { limit = 20, offset = 0 } = options;
  const supabase = await createClient();

  const { data, error, count } = await supabase
    .from("reviews")
    .select(`*, profile:profiles!user_id(nickname)`, { count: "exact" })
    .eq("artist_id", artistId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to fetch reviews: ${error.message}`);
    return { data: [], count: 0 };
  }

  return {
    data: (data ?? []) as unknown as ReviewWithUser[],
    count: count ?? 0,
  };
}

/**
 * Review with artist info for public reviews page
 */
export interface ReviewWithArtist extends Review {
  profile?: { nickname: string } | null;
  artist?: { id: string; title: string; user_id: string; profile_image_path: string | null; profiles?: { nickname: string; profile_image_path: string | null } | null } | null;
}

/**
 * Fetch all recent reviews (public, for /reviews page)
 */
export async function fetchAllReviews(
  options: { limit?: number; offset?: number } = {}
): Promise<{ data: ReviewWithArtist[]; count: number }> {
  const { limit = 20, offset = 0 } = options;
  const supabase = await createClient();

  const { data, error, count } = await supabase
    .from("reviews")
    .select(`*, profile:profiles!user_id(nickname), artist:artists!artist_id(id, title, user_id, profile_image_path, profiles:profiles!artists_user_id_fkey(nickname, profile_image_path))`, { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to fetch all reviews: ${error.message}`);
    return { data: [], count: 0 };
  }

  return {
    data: (data ?? []) as unknown as ReviewWithArtist[],
    count: count ?? 0,
  };
}
