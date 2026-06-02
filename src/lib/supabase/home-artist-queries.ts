import { unstable_cache } from "next/cache";
import { createStaticClient } from "./server";
import { getAvatarUrl, getArtistIdsWithPortfolio } from "./queries";
import { getStorageUrl } from "./storage-utils";
import { fetchBoostArtistIds } from "./boost-ranking";
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
  typeArtist: "SEMI_PERMANENT";
  profileImage: string | null;
  portfolioImage: string | null;
  /** 광고 집행 중인 회원 여부(인기 아티스트 우선 노출용). 미설정이면 일반 회원. */
  isAd?: boolean;
}

export interface ReviewedArtist extends HomeArtist {
  reviewCount: number;
  avgRating: number;
  portfolioImages: string[];
}

export type ArtistTypeFilter = "SEMI_PERMANENT";

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
  type_artist: "SEMI_PERMANENT";
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

/** 광고 회원(인기순 풀 밖일 수 있음)을 id 로 직접 조회해 카드 데이터로 매핑(ARTIST_SELECT/mapArtistRow 재사용). */
async function fetchAdArtistsByIds(
  supabase: SupabaseInstance,
  ids: string[],
  typeArtist: ArtistTypeFilter,
): Promise<HomeArtist[]> {
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("artists")
    .select(ARTIST_SELECT)
    .in("id", ids)
    .is("deleted_at", null)
    .eq("is_hide", false)
    .eq("status", "active")
    .eq("type_artist", typeArtist);

  return ((data ?? []) as ArtistRow[]).map((a) => ({
    ...mapArtistRow(a, null, getAvatarUrl(a.profile_image_path)),
    isAd: true,
  }));
}

async function fetchPopularArtistsInternal(options?: {
  typeArtist?: ArtistTypeFilter;
  limit?: number;
  prioritizeAds?: boolean;
}): Promise<HomeArtist[]> {
  const { typeArtist = "SEMI_PERMANENT", limit = 6, prioritizeAds = false } = options ?? {};
  const supabase = createStaticClient();

  // 인기 풀 RPC 와 광고주 id 조회는 서로 독립 → 병렬로 받아 캐시 미스 시 워터폴 제거.
  const [poolRes, adIdList] = await Promise.all([
    supabase.rpc("get_popular_artists_with_portfolio", { p_type_artist: typeArtist, p_limit: limit * 3 }),
    prioritizeAds ? fetchBoostArtistIds() : Promise.resolve<string[]>([]),
  ]);

  const { data, error } = poolRes;
  if (error) {
    throw new Error(`Failed to fetch popular artists: ${error.message}`);
  }

  const mapped: HomeArtist[] = ((data ?? []) as Array<{
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
    typeArtist: "SEMI_PERMANENT" as const,
    profileImage: getAvatarUrl(a.profile_image_path),
    portfolioImage: null,
  }));

  if (!prioritizeAds) return shuffleArray(mapped).slice(0, limit);

  // 광고 회원 우선: 인기 풀의 광고주 + 풀 밖 광고주(직접 조회)를 앞쪽에 배치. 그룹 내부는 셔플.
  const adIds = new Set(adIdList);
  if (adIds.size === 0) return shuffleArray(mapped).slice(0, limit);

  const adInPool = mapped.filter((a) => adIds.has(a.id)).map((a) => ({ ...a, isAd: true }));
  const nonAd = mapped.filter((a) => !adIds.has(a.id));

  const presentAdIds = new Set(adInPool.map((a) => a.id));
  const missingAdIds = [...adIds].filter((id) => !presentAdIds.has(id));
  const missingAd = await fetchAdArtistsByIds(supabase, missingAdIds, typeArtist);

  const ads = shuffleArray([...adInPool, ...missingAd]);
  const rest = shuffleArray(nonAd);
  return [...ads, ...rest].slice(0, limit);
}

export async function fetchPopularArtists(options?: {
  typeArtist?: ArtistTypeFilter;
  limit?: number;
  prioritizeAds?: boolean;
}): Promise<HomeArtist[]> {
  const { typeArtist, limit = 6, prioritizeAds = false } = options ?? {};
  const cacheKey = `home-popular-artists-${typeArtist ?? "default"}-${limit}-${prioritizeAds ? "ads" : "plain"}`;

  return unstable_cache(
    () => fetchPopularArtistsInternal({ typeArtist, limit, prioritizeAds }),
    [cacheKey],
    // 광고 우선 변형만 ads 태그 — revalidateTag("ads")로 검색 인기 목록 즉시 갱신
    { revalidate: 60, tags: prioritizeAds ? ["home", "artists", "ads"] : ["home", "artists"] },
  )();
}

// === Section: New Artists (registered within 7 days) ===

const NEW_ARTIST_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

async function fetchNewArtistsInternal(limit: number): Promise<HomeArtist[]> {
  const supabase = createStaticClient();
  const oneWeekAgo = new Date(Date.now() - NEW_ARTIST_WINDOW_MS).toISOString();

  const { data, error } = await supabase
    .from("artists")
    .select("id, title, introduce, address, likes_count, type_artist, profile_image_path, region:regions(name)")
    .is("deleted_at", null)
    .eq("is_hide", false)
    .eq("status", "active")
    .eq("type_artist", "SEMI_PERMANENT")
    .gte("created_at", oneWeekAgo);

  if (error) {
    throw new Error(`Failed to fetch new artists: ${error.message}`);
  }

  const artists = ((data ?? []) as ArtistRow[]).map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description ?? "",
    introduce: a.introduce ?? "",
    address: a.address,
    regionName: a.region?.name ?? null,
    likesCount: a.likes_count,
    lat: a.lat ?? null,
    lon: a.lon ?? null,
    typeArtist: a.type_artist,
    profileImage: getAvatarUrl(a.profile_image_path),
    portfolioImage: null,
  }));

  return secureShuffle(artists).slice(0, limit);
}

export async function fetchNewArtists(limit = 5): Promise<HomeArtist[]> {
  return unstable_cache(
    () => fetchNewArtistsInternal(limit),
    ["home-new-artists"],
    { revalidate: 60, tags: ["home", "artists"] },
  )();
}

// === Review Stats Helper ===

async function fetchReviewStatsMap(
  supabase: SupabaseInstance,
): Promise<Map<string, { count: number; totalRating: number }>> {
  const { data: artistIdRows } = await supabase
    .from("reviews")
    .select("artist_id")
    .is("deleted_at", null)
    // 무제한 조회 방지 — 후기 수가 이 임계치를 초과하면 DB 집계 RPC로 전환 필요
    .limit(10000);

  const uniqueIds = [...new Set((artistIdRows ?? []).map((r: { artist_id: string }) => r.artist_id))];
  if (uniqueIds.length === 0) return new Map();

  const { data } = await supabase.rpc("get_artist_review_stats", { artist_ids: uniqueIds });

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

function filterArtistsByType(artists: ArtistRow[]): ArtistRow[] {
  return artists;
}

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
    const semiIds = await getArtistIdsByType(supabase);
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

  const artists = filterArtistsByType((data ?? []) as ArtistRow[]);

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
