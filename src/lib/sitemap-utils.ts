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
  return Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
}

export { SITE_URL };
