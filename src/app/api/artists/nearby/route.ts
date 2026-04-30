import { NextRequest, NextResponse } from "next/server";
import { createStaticClient } from "@/lib/supabase/server";
import { getAvatarUrl } from "@/lib/supabase/queries";

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

  const artists = (data ?? []).map(
    (a: {
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
    }) => ({
      id: a.id,
      title: a.title,
      address: a.address,
      regionName: a.region_name,
      likesCount: a.likes_count,
      typeArtist: a.type_artist,
      profileImage: getAvatarUrl(a.profile_image_path),
      distanceKm: a.distance_km,
    }),
  );

  return NextResponse.json({ artists });
}
