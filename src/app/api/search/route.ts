import { NextResponse, type NextRequest } from "next/server";
import { globalSearch, MAX_SEARCH_OFFSET } from "@/lib/supabase/global-search-queries";
import { SEARCH_PAGE_SIZE } from "@/lib/search-match";

/** 한 요청이 만들 수 있는 최대 페이지 크기 — .in("id", …) URL 길이와 후보 캡을 함께 고려한 값 */
const MAX_LIMIT = SEARCH_PAGE_SIZE * 2;

// Public read-only 검색 — 60초 CDN/Vercel Data Cache + stale-while-revalidate 로 latency 단축.
const SEARCH_CACHE_TTL = 60;
const SEARCH_CACHE_SWR = 120;

/** 빈 문자열("?limit=")은 Number("")=0 이라 그냥 두면 1건만 반환된다 → 기본값으로 폴백 */
function parseCount(raw: string | null, fallback: number, max: number): number {
  const text = raw?.trim() ?? "";
  const n = text === "" ? fallback : Number(text);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(0, Math.trunc(n)));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limit = Math.max(1, parseCount(request.nextUrl.searchParams.get("limit"), SEARCH_PAGE_SIZE, MAX_LIMIT));
  const offset = parseCount(request.nextUrl.searchParams.get("offset"), 0, MAX_SEARCH_OFFSET);

  const result = await globalSearch(q, offset, limit);

  return NextResponse.json(result, {
    headers: { "Cache-Control": `public, s-maxage=${SEARCH_CACHE_TTL}, stale-while-revalidate=${SEARCH_CACHE_SWR}` },
  });
}
