import { NextRequest, NextResponse } from "next/server";
import { createStaticClient } from "@/lib/supabase/server";
import { getAvatarUrl, getStorageUrl } from "@/lib/supabase/queries";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const radius = parseInt(searchParams.get("radius") ?? "30", 10);
  const limit = parseInt(searchParams.get("limit") ?? "30", 10);
  const typeArtist = searchParams.get("type") ?? undefined;

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "lat, lng required" }, { status: 400 });
  }

  if (lat < 33 || lat > 39 || lng < 124 || lng > 132) {
    return NextResponse.json({ error: "coordinates out of Korea range" }, { status: 400 });
  }

  const supabase = createStaticClient();

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

  const rows = (data ?? []) as Array<{
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
  }>;

  const artistIds = rows.map((a) => a.id);

  const portfolioMap = new Map<string, string[]>();
  if (artistIds.length > 0) {
    const { data: artistPortfolios } = await supabase
      .from("artists")
      .select("id, portfolios(id, portfolio_media(storage_path, order_index))")
      .in("id", artistIds)
      .is("portfolios.deleted_at", null)
      .limit(3, { foreignTable: "portfolios" });

    for (const artist of (artistPortfolios ?? []) as Array<{
      id: string;
      portfolios: Array<{
        id: string;
        portfolio_media: Array<{ storage_path: string; order_index: number }>;
      }>;
    }>) {
      const allMedia = (artist.portfolios ?? []).flatMap((p) =>
        [...(p.portfolio_media ?? [])].sort((a, b) => a.order_index - b.order_index),
      );
      const images: string[] = [];
      for (const m of allMedia) {
        if (images.length >= 3) break;
        const url = getStorageUrl(m.storage_path);
        if (url) images.push(url);
      }
      if (images.length > 0) portfolioMap.set(artist.id, images);
    }
  }

  const artists = rows.map((a) => ({
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

  return NextResponse.json({ artists });
}
