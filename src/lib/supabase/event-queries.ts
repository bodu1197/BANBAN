import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient, createAdminClient } from "./server";
import { getEventStorageUrl } from "./storage-utils";
import type { Database } from "@/types/database";

type Event = Database["public"]["Tables"]["events"]["Row"];
type EventMedia = Database["public"]["Tables"]["event_media"]["Row"];
type Artist = Database["public"]["Tables"]["artists"]["Row"];
type Region = Database["public"]["Tables"]["regions"]["Row"];

export interface EventWithDetails extends Event {
  artist: Artist & { region?: Region | null };
  event_media: EventMedia[];
}

export interface EventCardData {
  id: string;
  title: string;
  procedure_name: string;
  price: number;
  price_origin: number;
  discount_rate: number | null;
  event_period_text: string | null;
  status: string;
  created_at: string | null;
  views_count: number | null;
  likes_count: number | null;
  hero_image: string | null;
  artist: { title: string; region?: { name: string } | null };
}

function mapRowToEventCard(
  row: {
    id: string;
    title: string;
    procedure_name: string;
    price: number;
    price_origin: number;
    discount_rate: number | null;
    event_period_text: string | null;
    status: string;
    created_at: string | null;
    views_count: number | null;
    likes_count: number | null;
    event_media: Array<{ storage_path: string; media_type: string }> | { storage_path: string; media_type: string };
    artist: Array<{ title: string; region?: { name: string } | null }> | { title: string; region?: { name: string } | null } | null;
  },
): EventCardData {
  const media = Array.isArray(row.event_media) ? row.event_media : [];
  const thumbnail = media.find((m) => m.media_type === "thumbnail")
    ?? media.find((m) => m.media_type === "detail_hero")
    ?? media.find((m) => m.media_type === "hero");
  const artist = Array.isArray(row.artist) ? row.artist[0] : row.artist;
  return {
    id: row.id,
    title: row.title,
    procedure_name: row.procedure_name,
    price: row.price,
    price_origin: row.price_origin,
    discount_rate: row.discount_rate,
    event_period_text: row.event_period_text,
    status: row.status,
    created_at: row.created_at,
    views_count: row.views_count,
    likes_count: row.likes_count,
    hero_image: thumbnail ? getEventStorageUrl(thumbnail.storage_path) : null,
    artist: artist ?? { title: "" },
  };
}

const EVENT_CARD_SELECT =
  "id, title, procedure_name, price, price_origin, discount_rate, event_period_text, status, created_at, views_count, likes_count, event_media(storage_path, media_type), artist:artists(title, region:regions(name))";

const EVENT_CARD_SELECT_INNER =
  "id, title, procedure_name, price, price_origin, discount_rate, event_period_text, status, created_at, views_count, likes_count, event_media!inner(storage_path, media_type), artist:artists(title, region:regions(name))";

// === Public queries ===

export const fetchEventById = cache(async function fetchEventById(
  id: string,
): Promise<EventWithDetails | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*, event_media(*), artist:artists(*, region:regions(*))")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!data) return null;

  const artist = Array.isArray(data.artist) ? data.artist[0] : data.artist;
  const event_media = Array.isArray(data.event_media) ? data.event_media : [];

  return {
    ...data,
    artist,
    event_media: event_media.map((m: EventMedia) => ({
      ...m,
      storage_path: getEventStorageUrl(m.storage_path) ?? m.storage_path,
    })),
  } as EventWithDetails;
});

export interface EventSearchResult {
  events: EventCardData[];
  totalCount: number;
}

function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

/**
 * 오늘 날짜 (YYYY-MM-DD). event_end_at 비교용.
 * 만료 정책: event_end_at IS NULL (만료 없음) 또는 event_end_at >= 오늘 → 노출.
 */
export function getActiveEventFilter(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `event_end_at.is.null,event_end_at.gte.${today}`;
}

async function resolveArtistIdsByRegion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  regionId: string | null,
  regionSido: string | null,
): Promise<string[] | null> {
  if (!regionId && !regionSido) return null;
  let regionIds: string[] = [];
  if (regionSido) {
    const { data: rData } = await supabase
      .from("regions")
      .select("id")
      .like("name", `${escapeLikePattern(regionSido)}%`);
    regionIds = (rData ?? []).map((r) => r.id);
    if (regionIds.length === 0) return [];
  } else if (regionId) {
    regionIds = [regionId];
  }
  const { data: artists } = await supabase
    .from("artists")
    .select("id")
    .in("region_id", regionIds)
    .is("deleted_at", null);
  return (artists ?? []).map((a) => a.id);
}

export const fetchPublishedEvents = cache(async function fetchPublishedEvents(
  opts: { limit?: number; offset?: number; categoryId?: string; regionId?: string | null; regionSido?: string | null } = {},
): Promise<EventSearchResult> {
  const supabase = await createClient();
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;

  const artistIds = await resolveArtistIdsByRegion(supabase, opts.regionId ?? null, opts.regionSido ?? null);
  if (artistIds !== null && artistIds.length === 0) {
    return { events: [], totalCount: 0 };
  }

  let query = supabase
    .from("events")
    .select(EVENT_CARD_SELECT_INNER, { count: "exact" })
    .eq("status", "published")
    .is("deleted_at", null)
    .or(getActiveEventFilter())
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (artistIds !== null) {
    query = query.in("artist_id", artistIds);
  }

  if (opts.categoryId) {
    const { data: catLinks } = await supabase
      .from("categorizables")
      .select("categorizable_id")
      .eq("categorizable_type", "event")
      .eq("category_id", opts.categoryId);
    const ids = (catLinks ?? []).map((c) => c.categorizable_id);
    if (ids.length === 0) return { events: [], totalCount: 0 };
    query = query.in("id", ids);
  }

  const { data, count } = await query;
  if (!data) return { events: [], totalCount: 0 };

  return {
    events: data.map(mapRowToEventCard),
    totalCount: count ?? data.length,
  };
});

export const fetchEventsByArtist = cache(async function fetchEventsByArtist(
  artistId: string,
): Promise<EventCardData[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select(EVENT_CARD_SELECT)
    .eq("artist_id", artistId)
    .eq("status", "published")
    .is("deleted_at", null)
    .or(getActiveEventFilter())
    .order("created_at", { ascending: false });

  if (!data) return [];

  return data.map(mapRowToEventCard);
});

// === Write operations (admin client for RLS bypass) ===

export async function createEvent(
  payload: Database["public"]["Tables"]["events"]["Insert"],
): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("events")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(`이벤트 생성 실패: ${error.message}`);
  return data.id;
}

export async function updateEvent(
  id: string,
  payload: Database["public"]["Tables"]["events"]["Update"],
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("events")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`이벤트 수정 실패: ${error.message}`);
}

export async function deleteEvent(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("events")
    .update({ deleted_at: new Date().toISOString(), status: "deleted" })
    .eq("id", id);
  if (error) throw new Error(`이벤트 삭제 실패: ${error.message}`);
}

export async function insertEventMedia(
  eventId: string,
  media: Array<{ storage_path: string; media_type: string; order_index: number; alt_text?: string | null; section_prompt?: string | null }>,
): Promise<void> {
  if (media.length === 0) return;
  const supabase = createAdminClient();
  const rows = media.map((m) => ({
    event_id: eventId,
    storage_path: m.storage_path,
    media_type: m.media_type,
    order_index: m.order_index,
    alt_text: m.alt_text ?? null,
    section_prompt: m.section_prompt ?? null,
  }));
  const { error } = await supabase.from("event_media").insert(rows);
  if (error) throw new Error(`이벤트 미디어 저장 실패: ${error.message}`);
}

export async function deleteEventMediaByType(
  eventId: string,
  mediaType: string,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("event_media")
    .delete()
    .eq("event_id", eventId)
    .eq("media_type", mediaType);
  if (error) throw new Error(`이벤트 미디어 삭제 실패: ${error.message}`);
}

export async function insertEventCategories(
  eventId: string,
  categoryIds: string[],
): Promise<void> {
  if (categoryIds.length === 0) return;
  const supabase = createAdminClient();
  const rows = categoryIds.map((category_id) => ({
    category_id,
    categorizable_type: "event" as const,
    categorizable_id: eventId,
  }));
  const { error } = await supabase.from("categorizables").insert(rows);
  if (error) throw new Error(`이벤트 카테고리 저장 실패: ${error.message}`);
}

export async function incrementEventViews(id: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("events")
      .select("views_count")
      .eq("id", id)
      .single();
    if (data) {
      await supabase
        .from("events")
        .update({ views_count: (data.views_count ?? 0) + 1 })
        .eq("id", id);
    }
  } catch {
    /* non-fatal view counter */
  }
}

async function fetchPopularEventsInternal(limit: number): Promise<EventCardData[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select(EVENT_CARD_SELECT)
    .eq("status", "published")
    .is("deleted_at", null)
    .or(getActiveEventFilter())
    .order("views_count", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data) return [];

  return data.map(mapRowToEventCard);
}

// 인기 이벤트 ISR 300s — 홈 페이지 SSR 응답 시간 단축. cache() 로 같은 요청 내 dedup.
export const fetchPopularEvents = cache(
  async (limit = 8): Promise<EventCardData[]> => {
    return unstable_cache(
      () => fetchPopularEventsInternal(limit),
      [`popular-events-${limit}`],
      { revalidate: 300, tags: ["events"] },
    )();
  },
);

export const fetchRelatedEvents = cache(async function fetchRelatedEvents(
  artistId: string,
  excludeId: string,
  limit = 6,
): Promise<EventCardData[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select(EVENT_CARD_SELECT)
    .eq("status", "published")
    .eq("artist_id", artistId)
    .neq("id", excludeId)
    .is("deleted_at", null)
    .or(getActiveEventFilter())
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data) return [];

  return data.map(mapRowToEventCard);
});

export interface ArtistShopStats {
  eventCount: number;
  portfolioCount: number;
}

export const fetchArtistShopStats = cache(async function fetchArtistShopStats(
  artistId: string,
): Promise<ArtistShopStats> {
  const supabase = await createClient();
  const [events, portfolios] = await Promise.all([
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("artist_id", artistId)
      .eq("status", "published")
      .is("deleted_at", null)
      .or(getActiveEventFilter()),
    supabase
      .from("portfolios")
      .select("id", { count: "exact", head: true })
      .eq("artist_id", artistId)
      .is("deleted_at", null),
  ]);
  return {
    eventCount: events.count ?? 0,
    portfolioCount: portfolios.count ?? 0,
  };
});

export const fetchRecommendedEvents = cache(async function fetchRecommendedEvents(
  excludeId: string,
  artistId: string,
  limit = 15,
): Promise<EventCardData[]> {
  const supabase = await createClient();
  const [sameArtist, popular] = await Promise.all([
    supabase
      .from("events")
      .select(EVENT_CARD_SELECT)
      .eq("status", "published")
      .eq("artist_id", artistId)
      .neq("id", excludeId)
      .is("deleted_at", null)
      .or(getActiveEventFilter())
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("events")
      .select(EVENT_CARD_SELECT)
      .eq("status", "published")
      .neq("id", excludeId)
      .neq("artist_id", artistId)
      .is("deleted_at", null)
      .or(getActiveEventFilter())
      .order("views_count", { ascending: false, nullsFirst: false })
      .limit(limit),
  ]);

  const sameArtistCards = (sameArtist.data ?? []).map(mapRowToEventCard);
  const popularCards = (popular.data ?? []).map(mapRowToEventCard);
  const seen = new Set(sameArtistCards.map((e) => e.id));
  const deduped = popularCards.filter((e) => !seen.has(e.id));

  return [...sameArtistCards, ...deduped].slice(0, limit);
});
