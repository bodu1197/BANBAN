import { createAdminClient } from "@/lib/supabase/server";
import {
  SITE_URL,
  buildSitemapIndexEntry,
  calcPageCount,
  wrapSitemapIndex,
  xmlResponse,
} from "@/lib/sitemap-utils";

interface ContentEntry {
  slug: string;
  count: number;
}

async function getContentEntries(): Promise<ContentEntry[]> {
  const supabase = createAdminClient();

  const [artists, portfolios, exhibitions, courses, posts, encyclopedia, locationSeo] =
    await Promise.all([
      supabase.from("artists").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "active"),
      supabase.from("portfolios").select("*", { count: "exact", head: true }),
      supabase.from("exhibitions").select("*", { count: "exact", head: true }),
      supabase.from("courses").select("*", { count: "exact", head: true }),
      supabase.from("posts").select("*", { count: "exact", head: true }),
      supabase.from("encyclopedia_articles").select("*", { count: "exact", head: true }).eq("published", true),
      supabase.from("location_seo_pages").select("*", { count: "exact", head: true }).eq("published", true),
    ]);

  return [
    { slug: "artists", count: artists.count ?? 0 },
    { slug: "portfolios", count: portfolios.count ?? 0 },
    { slug: "exhibitions", count: exhibitions.count ?? 0 },
    { slug: "courses", count: courses.count ?? 0 },
    { slug: "community", count: posts.count ?? 0 },
    { slug: "encyclopedia", count: encyclopedia.count ?? 0 },
    { slug: "location", count: locationSeo.count ?? 0 },
  ];
}

export async function GET(): Promise<Response> {
  try {
    const now = new Date().toISOString();
    let entries = "";

    // Static pages sitemap
    entries += buildSitemapIndexEntry(
      `${SITE_URL}/sitemap/static.xml`,
      now,
    );

    // Dynamic content sitemaps with pagination
    const contentEntries = await getContentEntries();

    for (const { slug, count } of contentEntries) {
      if (count === 0) continue;
      const pages = calcPageCount(count);

      for (let page = 1; page <= pages; page++) {
        entries += buildSitemapIndexEntry(
          `${SITE_URL}/sitemap/${slug}.xml?page=${page}`,
          now,
        );
      }
    }

    return xmlResponse(wrapSitemapIndex(entries));
  } catch {
    return new Response("Error generating sitemap index", { status: 500 });
  }
}
