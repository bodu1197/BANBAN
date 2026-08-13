import { createAdminClient } from "@/lib/supabase/server";
import { countPublicPortfolios } from "@/lib/supabase/portfolio-listing-queries";
import {
  SITE_URL,
  buildSitemapIndexEntry,
  calcPageCount,
  wrapSitemapIndex,
  xmlResponse,
} from "@/lib/sitemap-utils";

/**
 * 인덱스는 하위 사이트맵의 페이지 수를 "지금" 세어서 알려야 한다.
 * ISR 로 굳어 있으면 배포 시점 개수가 남아, 글이 늘면 뒤쪽 page=N 을 아예 안 알리고
 * 줄면 빈 page=N 을 제출한다. 게다가 500 은 ISR 캐시에 안 써져서 옛 본문이 만료(1년)까지 계속 나간다.
 * 하위 사이트맵(community.xml 등)은 searchParams 때문에 이미 동적이라 여기만 맞추면 된다.
 * CDN 캐시는 xmlResponse 의 s-maxage=300 이 그대로 담당한다.
 */
export const dynamic = "force-dynamic";

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
      supabase.from("posts").select("*", { count: "exact", head: true }).is("deleted_at", null),
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
