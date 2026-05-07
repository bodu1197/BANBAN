import { buildUrlEntry, wrapUrlset, xmlResponse } from "@/lib/sitemap-utils";

const STATIC_PAGES = [
  "", "/artists", "/portfolios", "/about", "/terms",
  "/privacy", "/refund-policy", "/contact", "/partnership", "/women-beauty", "/mens-beauty",
  "/exhibition", "/discount", "/community", "/courses", "/blog", "/artist-insight", "/encyclopedia",
];

export async function GET(): Promise<Response> {
  const now = new Date().toISOString();

  const urls = STATIC_PAGES.map((page) =>
    buildUrlEntry(page || "/", now, "daily", page === "" ? "1.0" : "0.8"),
  ).join("");

  return xmlResponse(wrapUrlset(urls));
}
