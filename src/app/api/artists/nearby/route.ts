import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAvatarUrl, getStorageUrl } from "@/lib/supabase/queries";

interface NearbyArtistRow {
  id: string;
  title: string;
  address: string;
  lat: number;
  lon: number;
  type_artist: string;
  likes_count: number;
  profile_image_path: string | null;
  region_name: string | null;
  distance_km: number;
}

interface ArtistPortfolioRow {
  id: string;
  portfolios: Array<{
    id: string;
    portfolio_media: Array<{ storage_path: string; order_index: number }>;
  }>;
}

function parseParams(searchParams: URLSearchParams): {
  lat: number;
  lng: number;
  radius: number;
  limit: number;
  typeArtist: string | undefined;
} {
  return {
    lat: parseFloat(searchParams.get("lat") ?? ""),
    lng: parseFloat(searchParams.get("lng") ?? ""),
    radius: parseInt(searchParams.get("radius") ?? "30", 10),
    limit: parseInt(searchParams.get("limit") ?? "30", 10),
    typeArtist: searchParams.get("type") ?? undefined,
  };
}

function validateCoordinates(lat: number, lng: number): string | null {
  if (Number.isNaN(lat) || Number.isNaN(lng)) return "lat, lng required";
  if (lat < 33 || lat > 39 || lng < 124 || lng > 132) return "coordinates out of Korea range";
  return null;
}

function extractPortfolioImages(artist: ArtistPortfolioRow): string[] {
  const allMedia = (artist.portfolios ?? []).flatMap((p) =>
    [...(p.portfolio_media ?? [])].sort((a, b) => a.order_index - b.order_index),
  );
  const images: string[] = [];
  for (const m of allMedia) {
    if (images.length >= 3) break;
    const url = getStorageUrl(m.storage_path);
    if (url) images.push(url);
  }
  return images;
}

async function fetchPortfolioMap(
  supabase: ReturnType<typeof createAdminClient>,
  artistIds: string[],
): Promise<Map<string, string[]>> {
  const portfolioMap = new Map<string, string[]>();
  if (artistIds.length === 0) return portfolioMap;

  const { data: artistPortfolios } = await supabase
    .from("artists")
    .select("id, portfolios(id, portfolio_media(storage_path, order_index))")
    .in("id", artistIds)
    .is("portfolios.deleted_at", null)
    .limit(3, { foreignTable: "portfolios" });

  for (const artist of (artistPortfolios ?? []) as ArtistPortfolioRow[]) {
    const images = extractPortfolioImages(artist);
    if (images.length > 0) portfolioMap.set(artist.id, images);
  }
  return portfolioMap;
}

function mapArtistRows(
  rows: NearbyArtistRow[],
  portfolioMap: Map<string, string[]>,
): Array<Record<string, unknown>> {
  return rows.map((a) => ({
    id: a.id,
    title: a.title,
    address: a.address,
    regionName: a.region_name,
    likesCount: a.likes_count,
    typeArtist: a.type_artist,
    profileImage: getAvatarUrl(a.profile_image_path),
    portfolioImages: portfolioMap.get(a.id) ?? [],
    distanceKm: a.distance_km,
  }));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { lat, lng, radius, limit, typeArtist } = parseParams(request.nextUrl.searchParams);

  const coordError = validateCoordinates(lat, lng);
  if (coordError) {
    return NextResponse.json({ error: coordError }, { status: 400 });
  }

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types yet
  const { data, error } = await (supabase as any).rpc("nearby_artists", {
    user_lat: lat,
    user_lng: lng,
    max_distance_km: Math.min(radius, 100),
    limit_count: Math.min(limit, 50),
    p_type_artist: typeArtist || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as NearbyArtistRow[];
  const portfolioMap = await fetchPortfolioMap(supabase, rows.map((a) => a.id));

  return NextResponse.json({ artists: mapArtistRows(rows, portfolioMap) });
}
