import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getEventStorageUrl } from "@/lib/supabase/storage-utils";
import { MAX_LIMIT } from "@/lib/constants";

const MAX_NEARBY_RADIUS_KM = 100;
const NEARBY_ARTIST_POOL = 100;
const KOREA_BOUNDS = { minLat: 33, maxLat: 39, minLng: 124, maxLng: 132 };

interface NearbyArtistRow {
  id: string;
  distance_km: number;
}

interface EventRow {
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
  artist_id: string;
  event_media: Array<{ storage_path: string; media_type: string }>;
  artist: { title: string; region: { name: string } | null } | null;
}

function parseParams(searchParams: URLSearchParams): {
  lat: number;
  lng: number;
  radius: number;
  limit: number;
} {
  return {
    lat: parseFloat(searchParams.get("lat") ?? ""),
    lng: parseFloat(searchParams.get("lng") ?? ""),
    radius: parseInt(searchParams.get("radius") ?? "30", 10),
    limit: parseInt(searchParams.get("limit") ?? "50", 10),
  };
}

function validateCoordinates(lat: number, lng: number): string | null {
  if (Number.isNaN(lat) || Number.isNaN(lng)) return "lat, lng required";
  if (lat < KOREA_BOUNDS.minLat || lat > KOREA_BOUNDS.maxLat || lng < KOREA_BOUNDS.minLng || lng > KOREA_BOUNDS.maxLng) {
    return "coordinates out of Korea range";
  }
  return null;
}

function pickThumbnail(media: Array<{ storage_path: string; media_type: string }>): string | null {
  const thumb =
    media.find((m) => m.media_type === "thumbnail")
    ?? media.find((m) => m.media_type === "detail_hero")
    ?? media.find((m) => m.media_type === "hero");
  return thumb ? getEventStorageUrl(thumb.storage_path) : null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { lat, lng, radius, limit } = parseParams(request.nextUrl.searchParams);

  const coordError = validateCoordinates(lat, lng);
  if (coordError) {
    return NextResponse.json({ error: coordError }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: artistRows, error: rpcError } = await supabase.rpc("nearby_artists", {
    user_lat: lat,
    user_lng: lng,
    max_distance_km: Math.min(radius, MAX_NEARBY_RADIUS_KM),
    limit_count: NEARBY_ARTIST_POOL,
    p_type_artist: "SEMI_PERMANENT",
  });

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  const artists = (artistRows ?? []) as NearbyArtistRow[];
  const artistIds = artists.map((a) => a.id);
  if (artistIds.length === 0) {
    return NextResponse.json({ events: [], totalCount: 0 });
  }

  const distanceMap = new Map(artists.map((a) => [a.id, a.distance_km]));

  const { data: eventRows, error: eventError } = await supabase
    .from("events")
    .select(
      "id, title, procedure_name, price, price_origin, discount_rate, event_period_text, status, created_at, views_count, likes_count, artist_id, event_media!inner(storage_path, media_type), artist:artists(title, region:regions(name))",
    )
    .eq("status", "published")
    .is("deleted_at", null)
    .in("artist_id", artistIds)
    .limit(Math.min(limit, MAX_LIMIT));

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }

  const events = ((eventRows ?? []) as unknown as EventRow[])
    .map((row) => {
      const media = Array.isArray(row.event_media) ? row.event_media : [];
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
        hero_image: pickThumbnail(media),
        artist: artist ?? { title: "" },
        distanceKm: distanceMap.get(row.artist_id) ?? null,
      };
    })
    .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

  return NextResponse.json(
    { events, totalCount: events.length },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
  );
}
