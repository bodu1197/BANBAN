import { NextResponse, type NextRequest } from "next/server";
import { searchBlogPosts, fetchBlogCategories, type BlogSearchParams } from "@/lib/supabase/blog-queries";

const VALID_TYPES = new Set(["SEMI_PERMANENT"]);
const VALID_GENDERS = new Set(["MALE", "FEMALE"]);
const MAX_LIMIT = 5000;

function parseType(raw: string | null): BlogSearchParams["typeArtist"] {
  return VALID_TYPES.has(raw ?? "") ? (raw as BlogSearchParams["typeArtist"]) : null;
}

function parseGender(raw: string | null): BlogSearchParams["targetGender"] {
  return VALID_GENDERS.has(raw ?? "") ? (raw as BlogSearchParams["targetGender"]) : null;
}

function parseParams(sp: URLSearchParams): BlogSearchParams {
  return {
    typeArtist: parseType(sp.get("typeArtist")),
    targetGender: parseGender(sp.get("targetGender")),
    categoryName: sp.get("categoryName") || null,
    regionId: sp.get("regionId") || null,
    searchWord: sp.get("searchWord") || null,
    limit: Math.min(Number(sp.get("limit") ?? "20"), MAX_LIMIT),
    offset: Number(sp.get("offset") ?? "0"),
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sp = request.nextUrl.searchParams;
  const params = parseParams(sp);
  const includeCategories = sp.has("_categories");

  const result = await searchBlogPosts(params);

  if (includeCategories) {
    const categories = await fetchBlogCategories(params.typeArtist, params.targetGender);
    return NextResponse.json({ ...result, categories });
  }

  return NextResponse.json(result);
}
