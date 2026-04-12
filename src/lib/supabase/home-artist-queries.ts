import { unstable_cache } from "next/cache";
import { createStaticClient } from "./server";
import { getAvatarUrl, getArtistIdsWithPortfolio } from "./queries";
import { getStorageUrl } from "./storage-utils";
import { secureShuffle } from "@/lib/random";

type SupabaseInstance = Awaited<ReturnType<typeof createStaticClient>>;

// === Homepage Artist Types ===

export interface HomeArtist {
  id: string;
  title: string;
  description: string;
  introduce: string;
  address: string;
  regionName: string | null;
  likesCount: number;
  lat: number | null;
  lon: number | null;
  typeArtist: "TATTOO" | "SEMI_PERMANENT" | "BOTH";
  profileImage: string | null;
  portfolioImage: string | null;
}

export interface ReviewedArtist extends HomeArtist {
  reviewCount: number;
  avgRating: number;
  portfolioImages: string[];
}

export type ArtistTypeFilter = "TATTOO" | "SEMI_PERMANENT";

// === Internal Supabase join result types ===

interface ArtistRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  introduce: string | null;
  address: string;
  likes_count: number;
  views_count: number;
  lat: number | null;
  lon: number | null;
  type_artist: "TATTOO" | "SEMI_PERMANENT" | "BOTH";
  profile_image_path: string | null;
  region: { name: string } | null;
}

interface PortfolioImageRow {
  id: string;
  portfolio_media: Array<{ storage_path: string; order_index: number }>;
}

// === Helpers ===

async function getPortfolioImages(
  supabase: SupabaseInstance,
  artistId: string,
  count: number,
): Promise<string[]> {
  const { data } = await supabase
    .from("portfolios")
    .select("id, portfolio_media(storage_path, order_index)")
    .eq("artist_id", artistId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(count);

  const rows = data as PortfolioImageRow[] | null;
  if (!rows) return [];

  const images: string[] = [];
  for (const row of rows) {
    const sorted = [...(row.portfolio_media ?? [])].sort(
      (a, b) => a.order_index - b.order_index,
    );
    const url = sorted[0] ? getStorageUrl(sorted[0].storage_path) : null;
    if (url) images.push(url);
  }
  return images.slice(0, count);
}

function mapArtistRow(
  row: ArtistRow,
  portfolioImage: string | null,
  profileImage: string | null = null,
): HomeArtist {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    introduce: row.introduce ?? "",
    address: row.address,
    regionName: row.region?.name ?? null,
    likesCount: row.likes_count,
    lat: row.lat ?? null,
    lon: row.lon ?? null,
    typeArtist: row.type_artist,
    profileImage,
    portfolioImage,
  };
}

const ARTIST_SELECT =
  "id, user_id, title, description, introduce, address, likes_count, views_count, lat, lon, type_artist, profile_image_path, region:regions(name)";

// === Helpers: Shuffle ===

const shuffleArray = secureShuffle;

// === Section 1: Popular Artists ===

async function fetchPopularArtistsInternal(options?: {
  typeArtist?: ArtistTypeFilter;
  limit?: number;
}): Promise<HomeArtist[]> {
  const { typeArtist = "TATTOO", limit = 6 } = options ?? {};
  const supabase = createStaticClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types yet
  const { data, error } = await (supabase as any).rpc("get_popular_artists_with_portfolio", {
    p_type_artist: typeArtist,
    p_limit: limit * 3,
  });

  if (error) {
    throw new Error(`Failed to fetch popular artists: ${error.message}`);
  }

  const mapped = ((data ?? []) as Array<{
    id: string; title: string; description: string; introduce: string;
    address: string; likes_count: number; lat: number | null; lon: number | null;
    type_artist: string; profile_image_path: string | null;
    region_name: string | null;
  }>).map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description ?? "",
    introduce: a.introduce ?? "",
    address: a.address,
    regionName: a.region_name,
    likesCount: a.likes_count,
    lat: a.lat,
    lon: a.lon,
    typeArtist: a.type_artist as "TATTOO" | "SEMI_PERMANENT" | "BOTH",
    profileImage: getAvatarUrl(a.profile_image_path),
    portfolioImage: null,
  }));

  return shuffleArray(mapped).slice(0, limit);
}

export async function fetchPopularArtists(options?: {
  typeArtist?: ArtistTypeFilter;
  limit?: number;
}): Promise<HomeArtist[]> {
  const { typeArtist, limit = 6 } = options ?? {};
  const cacheKey = typeArtist
    ? `home-popular-artists-${typeArtist}`
    : "home-popular-artists";

  return unstable_cache(
    () => fetchPopularArtistsInternal({ typeArtist, limit }),
    [cacheKey],
    { revalidate: 60, tags: ["home", "artists"] },
  )();
}

// === Section: Recently Active Artists (24h login) ===

async function fetchActiveArtistsInternal(limit: number): Promise<HomeArtist[]> {
  const supabase = createStaticClient();
  const fetchPool = limit * 3;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types yet
  const { data, error } = await (supabase as any).rpc("get_recently_active_artists", {
    p_hours: 24,
    p_limit: fetchPool,
  });

  if (error) {
    throw new Error(`Failed to fetch active artists: ${error.message}`);
  }

  const artists = ((data ?? []) as Array<{
    id: string; title: string; introduce: string;
    address: string; likes_count: number;
    type_artist: string; profile_image_path: string | null;
    region_name: string | null; portfolio_media_count: number;
  }>).map((a) => ({
    id: a.id,
    title: a.title,
    description: "",
    introduce: a.introduce ?? "",
    address: a.address ?? "",
    regionName: a.region_name,
    likesCount: a.likes_count,
    lat: null,
    lon: null,
    typeArtist: a.type_artist as "TATTOO" | "SEMI_PERMANENT" | "BOTH",
    profileImage: getAvatarUrl(a.profile_image_path),
    portfolioImage: null,
  }));

  return secureShuffle(artists).slice(0, limit);
}

export async function fetchActiveArtists(limit = 10): Promise<HomeArtist[]> {
  return unstable_cache(
    () => fetchActiveArtistsInternal(limit),
    ["home-active-artists"],
    { revalidate: 60, tags: ["home", "artists"] },
  )();
}

// === Review Stats Helper ===

async function fetchReviewStatsMap(
  supabase: SupabaseInstance,
): Promise<Map<string, { count: number; totalRating: number }>> {
  const { data: artistIds } = await supabase
    .from("reviews")
    .select("artist_id")
    .is("deleted_at", null);

  const uniqueIds = [...new Set((artistIds ?? []).map((r: { artist_id: string }) => r.artist_id))];
  if (uniqueIds.length === 0) return new Map();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types yet
  const { data } = await (supabase as any).rpc("get_artist_review_stats", { artist_ids: uniqueIds });

  const statsMap = new Map<string, { count: number; totalRating: number }>();
  for (const row of (data ?? []) as Array<{ artist_id: string; review_count: number; avg_rating: number }>) {
    statsMap.set(row.artist_id, {
      count: Number(row.review_count),
      totalRating: Number(row.avg_rating) * Number(row.review_count),
    });
  }
  return statsMap;
}

// === Section 2, 7: Artists with Most Reviews ===

async function getCategoryName(
  supabase: SupabaseInstance,
  categoryId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("categories")
    .select("name")
    .eq("id", categoryId)
    .single();
  return (data as { name: string } | null)?.name ?? null;
}

async function fetchCategoryArtistIds(
  supabase: SupabaseInstance,
  categoryId: string,
): Promise<string[]> {
  const categoryName = await getCategoryName(supabase, categoryId);
  if (!categoryName) return [];

  const { data } = await supabase
    .from("artists")
    .select("id")
    .is("deleted_at", null)
    .eq("is_hide", false)
    .eq("status", "active")
    .gte("portfolio_media_count", 5)
    .or(`description.ilike.%${categoryName}%,introduce.ilike.%${categoryName}%`);

  return (data ?? []).map((r: { id: string }) => r.id);
}

async function enrichArtistWithReviews(
  supabase: SupabaseInstance,
  artist: ArtistRow,
  statsMap: Map<string, { count: number; totalRating: number }>,
): Promise<ReviewedArtist> {
  const stats = statsMap.get(artist.id);
  const portfolioImages = await getPortfolioImages(supabase, artist.id, 3);
  const profileImage = getAvatarUrl(artist.profile_image_path);
  return {
    ...mapArtistRow(artist, portfolioImages[0] ?? null, profileImage),
    reviewCount: stats?.count ?? 0,
    avgRating: stats ? Math.round((stats.totalRating / stats.count) * 10) / 10 : 0,
    portfolioImages,
  };
}

type ReviewStatsEntry = [string, { count: number; totalRating: number }];

function filterEntriesByIds(entries: ReviewStatsEntry[], idSet: Set<string>): ReviewStatsEntry[] {
  return entries.filter(([id]) => idSet.has(id));
}

function filterArtistsByType(artists: ArtistRow[], typeArtist: ArtistTypeFilter): ArtistRow[] {
  return typeArtist === "TATTOO"
    ? artists.filter((a) => a.type_artist === "TATTOO" || a.type_artist === "BOTH")
    : artists;
}

async function getArtistIdsByType(
  supabase: SupabaseInstance,
  typeArtist: ArtistTypeFilter,
): Promise<string[]> {
  const { data } = await supabase
    .from("artists")
    .select("id")
    .is("deleted_at", null)
    .eq("is_hide", false)
    .eq("status", "active")
    .gte("portfolio_media_count", 5)
    .or(`type_artist.eq.${typeArtist},type_artist.eq.BOTH`);

  return (data ?? []).map((a: { id: string }) => a.id);
}

async function getFilteredReviewEntries(
  supabase: SupabaseInstance,
  entries: ReviewStatsEntry[],
  categoryId: string | null | undefined,
  typeArtist: ArtistTypeFilter | undefined,
): Promise<ReviewStatsEntry[] | null> {
  let filtered = entries;

  if (categoryId) {
    const categoryIds = await fetchCategoryArtistIds(supabase, categoryId);
    if (categoryIds.length === 0) return null;
    filtered = filterEntriesByIds(filtered, new Set(categoryIds));
  }

  if (typeArtist === "SEMI_PERMANENT") {
    const semiIds = await getArtistIdsByType(supabase, "SEMI_PERMANENT");
    if (semiIds.length === 0) return null;
    filtered = filterEntriesByIds(filtered, new Set(semiIds));
  }

  return filtered;
}

async function fetchReviewedArtistsInternal(opts?: {
  typeArtist?: ArtistTypeFilter;
  categoryId?: string | null;
  limit?: number;
}): Promise<ReviewedArtist[]> {
  const { typeArtist, categoryId, limit: lim = 10 } = opts ?? {};
  const supabase = createStaticClient();

  const artistsWithPortfolio = await getArtistIdsWithPortfolio(supabase);
  if (artistsWithPortfolio.size === 0) return [];

  const statsMap = await fetchReviewStatsMap(supabase);

  const entriesWithPortfolio = [...statsMap.entries()].filter(
    ([id]) => artistsWithPortfolio.has(id),
  );

  const entries = await getFilteredReviewEntries(
    supabase,
    entriesWithPortfolio,
    categoryId,
    typeArtist,
  );
  if (!entries) return [];

  const sorted = entries.sort((a, b) => b[1].count - a[1].count).slice(0, lim * 2);
  if (sorted.length === 0) return [];

  const { data } = await supabase
    .from("artists")
    .select(ARTIST_SELECT)
    .in("id", sorted.map(([id]) => id))
    .is("deleted_at", null)
    .eq("is_hide", false)
    .eq("status", "active");

  const artists = typeArtist
    ? filterArtistsByType((data ?? []) as ArtistRow[], typeArtist)
    : ((data ?? []) as ArtistRow[]);

  const result = await Promise.all(
    artists.map((a) => enrichArtistWithReviews(supabase, a, statsMap)),
  );
  return result.sort((a, b) => b.reviewCount - a.reviewCount).slice(0, lim);
}

export async function fetchReviewedArtists(options?: {
  typeArtist?: ArtistTypeFilter;
  categoryId?: string | null;
  limit?: number;
}): Promise<ReviewedArtist[]> {
  const { typeArtist, categoryId, limit = 10 } = options ?? {};
  const cacheKey = [
    "home-reviewed-artists",
    typeArtist ?? "all",
    categoryId ?? "all",
  ].join("-");

  return unstable_cache(
    () => fetchReviewedArtistsInternal({ typeArtist, categoryId, limit }),
    [cacheKey],
    { revalidate: 60, tags: ["home", "reviews"] },
  )();
}
