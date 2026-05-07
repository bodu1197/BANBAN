import { NextResponse, type NextRequest } from "next/server";
import { searchPortfolios } from "@/lib/supabase/portfolio-search-queries";
import type { PortfolioSortOption, PortfolioSearchParams } from "@/types/portfolio-search";

const VALID_SORTS = new Set<PortfolioSortOption>(["popular", "price_asc", "price_desc", "newest", "discount", "random"]);
const VALID_TYPES = new Set(["SEMI_PERMANENT"]);
const MAX_LIMIT = 48;

function parseSort(raw: string | null): PortfolioSortOption {
  const v = raw ?? "random";
  return VALID_SORTS.has(v as PortfolioSortOption) ? (v as PortfolioSortOption) : "random";
}

function splitOrUndefined(raw: string | null): string[] | undefined {
  return raw ? raw.split(",").filter(Boolean) : undefined;
}

function numberOrNull(raw: string | null): number | null {
  return raw ? Number(raw) : null;
}

function parseSearchParams(sp: URLSearchParams): PortfolioSearchParams | null {
  const typeArtist = sp.get("typeArtist");
  if (!typeArtist || !VALID_TYPES.has(typeArtist)) return null;

  const targetGender = sp.get("targetGender");
  const validGender = targetGender === "MALE" || targetGender === "FEMALE" ? targetGender : null;

  return {
    typeArtist: typeArtist as "SEMI_PERMANENT",
    targetGender: validGender,
    regionId: splitOrUndefined(sp.get("regionId")),
    regionSido: sp.get("regionSido") || null,
    categoryIds: splitOrUndefined(sp.get("categoryIds")),
    searchWord: sp.get("q") || null,
    sort: parseSort(sp.get("sort")),
    priceMin: numberOrNull(sp.get("priceMin")),
    priceMax: numberOrNull(sp.get("priceMax")),
    limit: Math.min(Number(sp.get("limit") ?? "24"), MAX_LIMIT),
    offset: Number(sp.get("offset") ?? "0"),
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = parseSearchParams(request.nextUrl.searchParams);
  if (!params) {
    return NextResponse.json({ error: "typeArtist must be SEMI_PERMANENT" }, { status: 400 });
  }

  const result = await searchPortfolios(params);
  return NextResponse.json(result);
}
