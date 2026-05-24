import { NextResponse, type NextRequest } from "next/server";
import { fetchPublishedEvents } from "@/lib/supabase/event-queries";
import { MAX_LIMIT } from "@/lib/constants";
import { parsePagination } from "@/lib/api-helpers";

function parseParams(sp: URLSearchParams): {
  regionId: string | null;
  regionSido: string | null;
  limit: number;
  offset: number;
} {
  const pagination = parsePagination(sp);
  return {
    regionId: sp.get("regionId") || null,
    regionSido: sp.get("regionSido") || sp.get("regionPrefix") || null,
    limit: Math.min(pagination.limit, MAX_LIMIT),
    offset: pagination.offset,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = parseParams(request.nextUrl.searchParams);
  try {
    const result = await fetchPublishedEvents(params);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch {
    return NextResponse.json({ events: [], totalCount: 0 }, { status: 500 });
  }
}
