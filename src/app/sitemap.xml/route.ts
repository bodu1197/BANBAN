/* eslint-disable no-console -- 사이트맵 생성 실패는 서버 로그에 남아야 원인을 찾을 수 있다(조용한 누락 방지) */
import { createAdminClient } from "@/lib/supabase/server";
import { countPublicPortfolios } from "@/lib/supabase/portfolio-listing-queries";
import { getActiveEventFilter } from "@/lib/supabase/event-queries";
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

const DEPLOYED_AT = new Date().toISOString();

interface ContentEntry {
  slug: string;
  count: number;
}

type CountResult = PromiseSettledResult<{ count: number | null } | number>;

/**
 * 하나가 실패해도 사이트맵 인덱스 전체를 500 으로 날리지 않는다 — 실패한 항목만 0(=스킵)으로 강등.
 * 조용히 0 으로 떨어뜨리면 특정 콘텐츠 타입이 사이트맵에서 통째로 사라져도 아무 신호가 안 남으므로,
 * 실패는 반드시 로그로 남긴다(구글이 그 타입을 발견 못 하는 SEO 사고로 이어진다).
 */
function settledCount(r: CountResult, slug: string): number {
  if (r.status !== "fulfilled") {
    console.error(`[sitemap] ${slug} count 실패 — 사이트맵에서 제외됨:`, r.reason);
    return 0;
  }
  return typeof r.value === "number" ? r.value : (r.value.count ?? 0);
}

async function getContentEntries(): Promise<ContentEntry[]> {
  const supabase = createAdminClient();

  const [artists, portfoliosCount, exhibitions, courses, posts, encyclopedia, locationSeo, studyNews, events] =
    await Promise.allSettled([
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
      // events.xml 본문과 술어 동일 유지 — 어긋나면 없는 page=N 제출/뒤쪽 누락.
      supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "published").is("deleted_at", null).or(getActiveEventFilter()),
    ]);

  return [
    { slug: "artists", count: settledCount(artists, "artists") },
    { slug: "portfolios", count: settledCount(portfoliosCount, "portfolios") },
    { slug: "exhibitions", count: settledCount(exhibitions, "exhibitions") },
    { slug: "courses", count: settledCount(courses, "courses") },
    { slug: "community", count: settledCount(posts, "community") },
    { slug: "encyclopedia", count: settledCount(encyclopedia, "encyclopedia") },
    { slug: "location", count: settledCount(locationSeo, "location") },
    { slug: "study-news", count: settledCount(studyNews, "study-news") },
    { slug: "events", count: settledCount(events, "events") },
  ];
}

export async function GET(): Promise<Response> {
  try {
    // lastmod 를 매 요청 "지금" 으로 채우면 구글이 이 신호를 통째로 무시한다.
    // 배포 시점(모듈 로드 시각)이 정적 페이지·인덱스가 실제로 바뀌는 시점이다.
    const now = DEPLOYED_AT;
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
