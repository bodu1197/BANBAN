import { createClient } from "./server";
import { getStorageUrl, getAvatarUrl } from "./queries";
import { fetchAdExemptArtistIds, MIN_PORTFOLIO_MEDIA } from "./artist-visibility";

type SupabaseInstance = Awaited<ReturnType<typeof createClient>>;

export interface ArtistListItem {
  id: string;
  name: string;
  region: string;
  address: string;
  profileImage: string | null;
  portfolioImages: string[];
  rating: number;
  reviewCount: number;
  likesCount: number;
}

interface FetchArtistsResult {
  artists: ArtistListItem[];
  totalCount: number;
  regionName: string | null;
}

interface FetchArtistsOptions {
  limit?: number;
  offset?: number;
  regionId?: string | null;
  regionPrefix?: string | null;
  typeArtist?: "TATTOO" | "SEMI_PERMANENT";
  genres?: string[];
  searchWord?: string;
}

interface PortfolioNested {
  id: string;
  portfolio_media: Array<{ storage_path: string; order_index: number }>;
}

interface ArtistRow {
  id: string;
  title: string;
  address: string;
  likes_count: number;
  profile_image_path: string | null;
  region: { id: string; name: string } | null;
  portfolios: PortfolioNested[];
}

// === Helpers ===

function extractImages(portfolios: PortfolioNested[]): string[] {
  const allMedia = portfolios.flatMap((p) =>
    [...(p.portfolio_media ?? [])].sort((a, b) => a.order_index - b.order_index),
  );
  return allMedia.slice(0, 3).flatMap((m) => {
    const url = getStorageUrl(m.storage_path);
    return url ? [url] : [];
  });
}

function calcRating(stats: { count: number; total: number } | undefined): number {
  return stats ? Math.round((stats.total / stats.count) * 10) / 10 : 0;
}

function toListItem(artist: ArtistRow, stats: Map<string, { count: number; total: number }>): ArtistListItem {
  const s = stats.get(artist.id);
  return {
    id: artist.id,
    name: artist.title,
    region: artist.region?.name ?? "",
    address: artist.address,
    profileImage: getAvatarUrl(artist.profile_image_path),
    portfolioImages: extractImages(artist.portfolios),
    rating: calcRating(s),
    reviewCount: s?.count ?? 0,
    likesCount: artist.likes_count,
  };
}

// === Data fetching ===

async function fetchReviewStats(
  supabase: SupabaseInstance,
  artistIds: string[],
): Promise<Map<string, { count: number; total: number }>> {
  if (artistIds.length === 0) return new Map();
  const { data } = await supabase
    .from("reviews")
    .select("artist_id, rating")
    .in("artist_id", artistIds)
    .is("deleted_at", null);

  const m = new Map<string, { count: number; total: number }>();
  for (const r of (data ?? []) as Array<{ artist_id: string; rating: number }>) {
    const e = m.get(r.artist_id) ?? { count: 0, total: 0 };
    e.count += 1;
    e.total += r.rating;
    m.set(r.artist_id, e);
  }
  return m;
}

async function fetchRegionIds(supabase: SupabaseInstance, prefix: string): Promise<string[]> {
  const { data } = await supabase
    .from("regions")
    .select("id")
    .ilike("name", `${prefix}%`);
  return (data ?? []).map((r: { id: string }) => r.id);
}

async function fetchGenreIds(
  supabase: SupabaseInstance,
  genres: string[],
  searchWord?: string,
): Promise<string[] | null> {
  let effective = [...genres];
  if (searchWord) {
    const { data: catData } = await supabase.from("categories").select("name").ilike("name", `%${searchWord}%`);
    if (catData?.length) effective = [...new Set([...effective, ...catData.map((c: { name: string }) => c.name)])];
  }
  if (effective.length === 0) return null;

  const conditions = effective.map((g) => `description.ilike.%${g}%,introduce.ilike.%${g}%`).join(",");
  const { data: artistData } = await supabase.from("artists").select("id").is("deleted_at", null).eq("is_hide", false).eq("status", "active").or(conditions);
  return (artistData ?? []).map((a: { id: string }) => a.id);
}

// === Portfolio-first query ===

/** artists → portfolios(inner) → portfolio_media(inner): only artists with images */
const SELECT = [
  "id, title, address, likes_count, profile_image_path",
  "region:regions(id, name)",
  "portfolios!inner(id, portfolio_media!inner(storage_path, order_index))",
].join(", ");

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase query builder typing
function applyFilters(q: any, opts: FetchArtistsOptions, regionIds: string[] | null): any {
  const { typeArtist, regionId, searchWord } = opts;
  if (typeArtist) q = q.or(`type_artist.eq.${typeArtist},type_artist.eq.BOTH`);
  if (regionId) q = q.eq("region_id", regionId);
  else if (regionIds?.length) q = q.in("region_id", regionIds);
  if (searchWord) q = q.or(`title.ilike.%${searchWord}%,description.ilike.%${searchWord}%,introduce.ilike.%${searchWord}%`);
  return q;
}

async function resolveRegionIds(
  supabase: SupabaseInstance,
  prefix: string | null | undefined,
): Promise<{ ids: string[] | null; empty: boolean }> {
  if (!prefix) return { ids: null, empty: false };
  const ids = await fetchRegionIds(supabase, prefix);
  return { ids, empty: ids.length === 0 };
}

const EMPTY: FetchArtistsResult = { artists: [], totalCount: 0, regionName: null };

// === Query builder ===

function buildVisibilityFilter(adExemptIds: Set<string>): string {
  if (adExemptIds.size === 0) return `portfolio_media_count.gte.${MIN_PORTFOLIO_MEDIA}`;
  const ids = [...adExemptIds].join(",");
  return `portfolio_media_count.gte.${MIN_PORTFOLIO_MEDIA},id.in.(${ids})`;
}

function buildBaseQuery(supabase: SupabaseInstance, options: FetchArtistsOptions, regionIds: string[] | null, adExemptIds: Set<string>): ReturnType<SupabaseInstance["from"]> {
  const { limit = 20, offset = 0 } = options;
  const query = supabase
    .from("artists")
    .select(SELECT, { count: "exact" })
    .is("deleted_at", null)
    .eq("is_hide", false)
    .eq("status", "active")
    .or(buildVisibilityFilter(adExemptIds))
    .is("portfolios.deleted_at", null)
    .order("likes_count", { ascending: false })
    .limit(3, { foreignTable: "portfolios" })
    .range(offset, offset + limit - 1);
  return applyFilters(query, options, regionIds);
}

async function applyGenreFilter(
  supabase: SupabaseInstance,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase query builder typing
  query: any,
  genres: string[],
  searchWord?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase query builder typing
): Promise<{ query: any; empty: boolean }> {
  if (genres.length === 0) return { query, empty: false };
  const genreIds = await fetchGenreIds(supabase, genres, searchWord);
  if (!genreIds?.length) return { query, empty: true };
  return { query: query.in("id", genreIds), empty: false };
}

function mapResults(
  rows: ArtistRow[],
  count: number,
  reviewStats: Map<string, { count: number; total: number }>,
  regionId: string | null | undefined,
): FetchArtistsResult {
  const regionName = regionId
    ? (rows.find((a) => a.region?.id === regionId)?.region?.name ?? null)
    : null;
  return {
    artists: rows.map((a) => toListItem(a, reviewStats)),
    totalCount: count,
    regionName,
  };
}

// === Public API ===

export async function fetchArtistsWithDetails(options: FetchArtistsOptions): Promise<FetchArtistsResult> {
  const { regionId, regionPrefix, genres = [], searchWord } = options;
  const supabase = await createClient();

  const [{ ids: regionIds, empty: noRegions }, adExemptIds] = await Promise.all([
    resolveRegionIds(supabase, regionPrefix),
    fetchAdExemptArtistIds(),
  ]);
  if (noRegions) return EMPTY;

  const baseQuery = buildBaseQuery(supabase, options, regionIds, adExemptIds);
  const { query, empty: noGenres } = await applyGenreFilter(supabase, baseQuery, genres, searchWord);
  if (noGenres) return EMPTY;

  const { data, count, error } = await query;
  if (error) {
    // eslint-disable-next-line no-console -- error logging
    console.error("Failed to fetch artists:", error.message);
    return EMPTY;
  }

  const rows = (data ?? []) as unknown as ArtistRow[];
  if (rows.length === 0) return { artists: [], totalCount: count ?? 0, regionName: null };

  const reviewStats = await fetchReviewStats(supabase, rows.map((a) => a.id));
  return mapResults(rows, count ?? 0, reviewStats, regionId);
}
