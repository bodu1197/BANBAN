import { NextResponse, type NextRequest } from "next/server";
import { searchPortfolios } from "@/lib/supabase/portfolio-search-queries";
import { MAX_LIMIT } from "@/lib/constants";
import { parsePagination } from "@/lib/api-helpers";
import type { PortfolioSortOption, PortfolioSearchParams } from "@/types/portfolio-search";

const VALID_SORTS = new Set<PortfolioSortOption>(["popular", "price_asc", "price_desc", "newest", "discount", "random"]);
const VALID_TYPES = new Set(["SEMI_PERMANENT"]);

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
    ...(() => { const p = parsePagination(sp, 24); return { limit: Math.min(p.limit, MAX_LIMIT), offset: p.offset }; })(),
  };
}

// Public 필터 검색 — 60s CDN cache (sort=random 은 동일 URL 에 동일 결과 반환, 다양성은 client 측에서)
const PORTFOLIO_SEARCH_CACHE_TTL = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = parseSearchParams(request.nextUrl.searchParams);
  if (!params) {
    return NextResponse.json({ error: "typeArtist must be SEMI_PERMANENT" }, { status: 400 });
  }

  const result = await searchPortfolios(params);
  return NextResponse.json(result, {
    headers: { "Cache-Control": `public, s-maxage=${PORTFOLIO_SEARCH_CACHE_TTL}, stale-while-revalidate=120` },
  });
}
