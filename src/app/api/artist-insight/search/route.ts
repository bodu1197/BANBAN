import { NextResponse, type NextRequest } from "next/server";
import { searchArtistInsights, type ArtistInsightSearchParams } from "@/lib/supabase/artist-insight-queries";

const VALID_TYPES = new Set(["TATTOO", "SEMI_PERMANENT"]);
const MAX_LIMIT = 40;

function parseParams(sp: URLSearchParams): ArtistInsightSearchParams {
  const raw = sp.get("typeArtist");
  return {
    typeArtist: VALID_TYPES.has(raw ?? "") ? (raw as ArtistInsightSearchParams["typeArtist"]) : null,
    regionId: sp.get("regionId") || null,
    limit: Math.min(Number(sp.get("limit") ?? "20"), MAX_LIMIT),
    offset: Number(sp.get("offset") ?? "0"),
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = parseParams(request.nextUrl.searchParams);
  const result = await searchArtistInsights(params);
  return NextResponse.json(result);
}
