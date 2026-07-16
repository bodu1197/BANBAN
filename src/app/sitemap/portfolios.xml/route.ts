import { fetchPublicPortfolioSitemapRows, normalizePage } from "@/lib/supabase/portfolio-listing-queries";
import { buildUrlEntry, wrapUrlset, xmlResponse } from "@/lib/sitemap-utils";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const page = normalizePage(request.nextUrl.searchParams.get("page"));

    // 목록 페이지네이션과 동일 술어(공개 포폴만) — 사이트맵 URL = 목록 링크 = 공개 상세, 세 집합 일치.
    const rows = await fetchPublicPortfolioSitemapRows(page);

    if (!rows.length) {
      return xmlResponse(wrapUrlset(""));
    }

    const urls = rows
      .map((p) =>
        buildUrlEntry(
          `/portfolios/${p.id}`,
          new Date(p.updated_at ?? Date.now()).toISOString(),
          "weekly",
          "0.7",
        ),
      )
      .join("");

    return xmlResponse(wrapUrlset(urls));
  } catch {
    return new Response("Error generating portfolios sitemap", { status: 500 });
  }
}
