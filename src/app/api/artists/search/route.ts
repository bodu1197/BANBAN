import { NextResponse, type NextRequest } from "next/server";
import { fetchArtistsWithDetails } from "@/lib/supabase/artist-queries";

const VALID_TYPES = new Set(["SEMI_PERMANENT"]);
const MAX_LIMIT = 48;

function parseParams(sp: URLSearchParams): {
  typeArtist: "SEMI_PERMANENT";
  regionId: string | null;
  regionPrefix: string | null;
  genres: string[];
  searchWord: string | undefined;
  limit: number;
  offset: number;
} | null {
  const typeArtist = sp.get("typeArtist");
  if (!typeArtist || !VALID_TYPES.has(typeArtist)) return null;

  const genresRaw = sp.get("genres");
  return {
    typeArtist: typeArtist as "SEMI_PERMANENT",
    regionId: sp.get("regionId") || null,
    regionPrefix: sp.get("regionSido") || sp.get("regionPrefix") || null,
    genres: genresRaw ? genresRaw.split(",").filter(Boolean) : [],
    searchWord: sp.get("searchWord") || undefined,
    limit: Math.min(Number(sp.get("limit") ?? "20"), MAX_LIMIT),
    offset: Number(sp.get("offset") ?? "0"),
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = parseParams(request.nextUrl.searchParams);
  if (!params) {
    return NextResponse.json(
      { error: "typeArtist must be SEMI_PERMANENT" },
      { status: 400 },
    );
  }

  try {
    const result = await fetchArtistsWithDetails(params);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { artists: [], totalCount: 0, regionName: null },
      { status: 500 },
    );
  }
}
