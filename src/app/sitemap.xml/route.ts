import { createAdminClient } from "@/lib/supabase/server";
import { countPublicPortfolios } from "@/lib/supabase/portfolio-listing-queries";
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

  const [artists, portfoliosCount, exhibitions, courses, posts, encyclopedia, locationSeo, studyNews] =
    await Promise.all([
      // artists.xml 본문과 술어를 맞춘다 — is_hide 가 빠져 있어 빈 page=N 이 제출되고 있었다.
      supabase.from("artists").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("is_hide", false).eq("status", "active"),
      // 포폴 개수는 본문(fetchPublicPortfolioSitemapRows)과 동일 anon client·동일 술어 → 인덱스 페이지수 = 실제 출력.
      countPublicPortfolios(),
      supabase.from("exhibitions").select("*", { count: "exact", head: true }),
      supabase.from("courses").select("*", { count: "exact", head: true }),
      // community.xml 본문과 술어가 같아야 인덱스 페이지 수 = 실제 출력 (없는 page=N 제출 방지)
      supabase.from("posts").select("*", { count: "exact", head: true }).is("deleted_at", null).is("guest_name", null),
      supabase.from("encyclopedia_articles").select("*", { count: "exact", head: true }).eq("published", true),
      supabase.from("location_seo_pages").select("*", { count: "exact", head: true }).eq("published", true),
      supabase.from("study_news_items").select("*", { count: "exact", head: true }).eq("status", "published"),
    ]);

  return [
    { slug: "artists", count: artists.count ?? 0 },
    { slug: "portfolios", count: portfoliosCount },
    { slug: "exhibitions", count: exhibitions.count ?? 0 },
    { slug: "courses", count: courses.count ?? 0 },
    { slug: "community", count: posts.count ?? 0 },
    { slug: "encyclopedia", count: encyclopedia.count ?? 0 },
    { slug: "location", count: locationSeo.count ?? 0 },
    { slug: "study-news", count: studyNews.count ?? 0 },
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
