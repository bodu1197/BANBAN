const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://banunni.com")
  .trim()
  .replace(/\/+$/, "");

/** Max URLs per sitemap file (Google limit: 50,000). */
export const URLS_PER_SITEMAP = 50_000;
/**
 * Items per sitemap page.
 *
 * Capped at 1000 because Supabase PostgREST enforces a hard `max-rows = 1000`
 * per request. A larger page size would silently drop rows beyond #1000,
 * causing missing URLs in the sitemap. Keep this ≤ the PostgREST cap.
 */
export const ITEMS_PER_PAGE = 1000;

/** Encode non-ASCII characters and XML-escape the URL for sitemap XML */
export function siteUrl(path: string): string {
  const encoded = encodeURI(path).replace(/&/g, "&amp;");
  return `${SITE_URL}${encoded}`;
}

export function buildUrlEntry(
  path: string,
  lastmod: string,
  changefreq: string,
  priority: string,
): string {
  const url = siteUrl(path);
  return `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export function wrapUrlset(urls: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export function wrapSitemapIndex(entries: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;
}

export function buildSitemapIndexEntry(loc: string, lastmod?: string): string {
  return `
  <sitemap>
    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}
  </sitemap>`;
}

export function xmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}

export function calcPageCount(totalItems: number): number {
  if (totalItems <= 0) return 0;
  return Math.ceil(totalItems / ITEMS_PER_PAGE);
}

/** Supabase count 응답 또는 숫자 — Promise.allSettled 결과 한 칸. */
export type SitemapCountResult = PromiseSettledResult<{ count: number | null } | number>;

/**
 * 사이트맵 인덱스의 개수 집계 한 칸을 읽는다.
 *
 * 하나가 실패해도 인덱스 전체를 500 으로 날리지 않고 그 항목만 0(=스킵)으로 강등한다.
 * 다만 조용히 0 이 되면 해당 콘텐츠 타입이 사이트맵에서 통째로 사라져도 아무도 모르므로,
 * 실패는 호출부가 로그로 남길 수 있게 `onError` 로 넘긴다.
 */
export function settledCount(
  result: SitemapCountResult,
  onError?: (reason: unknown) => void,
): number {
  if (result.status !== "fulfilled") {
    onError?.(result.reason);
    return 0;
  }
  return typeof result.value === "number" ? result.value : (result.value.count ?? 0);
}

export { SITE_URL };
