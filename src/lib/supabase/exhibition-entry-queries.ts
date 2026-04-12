import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

// ─── Types ───────────────────────────────────────────────

export interface ExhibitionDetail {
  id: string;
  title: string;
  subtitle: string | null;
  image_path: string;
  link_url: string | null;
  category: string;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
  entry_count: number;
}

export interface ExhibitionEntryWithDetails {
  id: string;
  portfolio_id: string;
  artist_id: string;
  status: string;
  created_at: string;
  portfolio: {
    id: string;
    title: string;
    price: number;
    price_origin: number;
    discount_rate: number;
    thumbnail_path: string | null;
  };
  artist: {
    id: string;
    title: string;
    profile_image_path: string | null;
  };
}

export interface ArtistEntry {
  id: string;
  portfolio_id: string;
  status: string;
  admin_note: string | null;
  created_at: string;
}

// ─── Queries ─────────────────────────────────────────────

/**
 * Fetch a single exhibition with its approved entry count.
 */
export async function fetchExhibitionById(id: string): Promise<ExhibitionDetail | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: exhibition, error } = await supabase
    .from("exhibitions")
    .select("id, title, subtitle, image_path, link_url, category, is_active, start_at, end_at, created_at")
    .eq("id", id)
    .single();

  if (error || !exhibition) return null;

  const row = exhibition as Record<string, unknown>;

  // Count approved entries
  const { count } = await supabase
    .from("exhibition_entries")
    .select("id", { count: "exact", head: true })
    .eq("exhibition_id", id)
    .eq("status", "approved");

  return {
    id: row.id as string,
    title: row.title as string,
    subtitle: (row.subtitle as string) ?? null,
    image_path: row.image_path as string,
    link_url: (row.link_url as string) ?? null,
    category: row.category as string,
    is_active: row.is_active as boolean,
    start_at: (row.start_at as string) ?? null,
    end_at: (row.end_at as string) ?? null,
    created_at: row.created_at as string,
    entry_count: count ?? 0,
  };
}

type PortfolioRow = { id: string; title: string; price: number; price_origin: number; discount_rate: number };
type MediaRow = { portfolio_id: string; storage_path: string; order_index: number };
type ArtistDetailRow = { id: string; title: string; profile_image_path: string | null };

/**
 * Map raw entry rows to ExhibitionEntryWithDetails using lookup maps.
 */
function mapEntriesToDetails(
  entries: Array<Record<string, unknown>>,
  portfolioMap: Map<string, PortfolioRow>,
  mediaMap: Map<string, string>,
  artistMap: Map<string, ArtistDetailRow>,
): ExhibitionEntryWithDetails[] {
  return entries
    .map((entry) => {
      const pid = entry.portfolio_id as string;
      const aid = entry.artist_id as string;
      const portfolio = portfolioMap.get(pid);
      const artist = artistMap.get(aid);

      if (!portfolio || !artist) return null;

      return {
        id: entry.id as string,
        portfolio_id: pid,
        artist_id: aid,
        status: entry.status as string,
        created_at: entry.created_at as string,
        portfolio: {
          id: portfolio.id,
          title: portfolio.title,
          price: portfolio.price,
          price_origin: portfolio.price_origin,
          discount_rate: portfolio.discount_rate,
          thumbnail_path: mediaMap.get(pid) ?? null,
        },
        artist: {
          id: artist.id,
          title: artist.title,
          profile_image_path: artist.profile_image_path,
        },
      };
    })
    .filter((e): e is ExhibitionEntryWithDetails => e !== null);
}

/** Pick the first media (lowest order_index) per portfolio. */
function buildMediaMap(media: MediaRow[] | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!media) return map;
  for (const m of media) {
    if (!map.has(m.portfolio_id)) map.set(m.portfolio_id, m.storage_path);
  }
  return map;
}

/**
 * Build lookup maps from raw portfolio, media, and artist arrays.
 */
function buildLookupMaps(
  portfolios: unknown[] | null,
  media: unknown[] | null,
  artists: unknown[] | null,
): {
  portfolioMap: Map<string, PortfolioRow>;
  mediaMap: Map<string, string>;
  artistMap: Map<string, ArtistDetailRow>;
} {
  return {
    portfolioMap: new Map((portfolios as PortfolioRow[] | null)?.map((p) => [p.id, p]) ?? []),
    mediaMap: buildMediaMap(media as MediaRow[] | null),
    artistMap: new Map((artists as ArtistDetailRow[] | null)?.map((a) => [a.id, a]) ?? []),
  };
}

/**
 * Fetch approved entries for an exhibition, with portfolio and artist data.
 */
export async function fetchExhibitionEntries(
  exhibitionId: string,
  limit?: number,
): Promise<ExhibitionEntryWithDetails[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let query = supabase
    .from("exhibition_entries")
    .select("id, portfolio_id, artist_id, status, created_at")
    .eq("exhibition_id", exhibitionId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (limit !== undefined) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) return [];

  const entries = data as Array<Record<string, unknown>>;
  const portfolioIds = entries.map((e) => e.portfolio_id as string);
  const artistIds = [...new Set(entries.map((e) => e.artist_id as string))];

  const [{ data: portfolios }, { data: media }, { data: artists }] = await Promise.all([
    supabase.from("portfolios").select("id, title, price, price_origin, discount_rate").in("id", portfolioIds),
    supabase.from("portfolio_media").select("portfolio_id, storage_path, order_index").in("portfolio_id", portfolioIds).order("order_index", { ascending: true }),
    supabase.from("artists").select("id, title, profile_image_path").in("id", artistIds),
  ]);

  const maps = buildLookupMaps(portfolios, media, artists);

  return mapEntriesToDetails(entries, maps.portfolioMap, maps.mediaMap, maps.artistMap);
}

/**
 * Fetch an artist's own entries for an exhibition (all statuses).
 */
export async function fetchArtistEntriesForExhibition(
  artistId: string,
  exhibitionId: string
): Promise<ArtistEntry[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data, error } = await supabase
    .from("exhibition_entries")
    .select("id, portfolio_id, status, admin_note, created_at")
    .eq("exhibition_id", exhibitionId)
    .eq("artist_id", artistId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    portfolio_id: row.portfolio_id as string,
    status: row.status as string,
    admin_note: (row.admin_note as string) ?? null,
    created_at: row.created_at as string,
  }));
}
