// 게시 뉴스 공개 읽기(서버 전용). unstable_cache(600s, "study-news" 태그).
// 수집 cron / 관리자 승인 시 revalidateTag(STUDY_NEWS_CACHE_TAG) 로 즉시 무효화.
import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";

export const STUDY_NEWS_CACHE_TAG = "study-news";

export interface StudyNewsItem {
  slug: string;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  tier: number;
  category: string | null;
  publishedAt: string | null;
}

const SELECT = "slug,title,summary,source_name,source_url,tier,category,published_at";

function mapRow(r: { slug: string; title: string; summary: string; source_name: string; source_url: string; tier: number; category: string | null; published_at: string | null }): StudyNewsItem {
  return { slug: r.slug, title: r.title, summary: r.summary, sourceName: r.source_name, sourceUrl: r.source_url, tier: r.tier, category: r.category, publishedAt: r.published_at };
}

/** 게시된 최신 뉴스 N건. */
export const getPublishedNews = unstable_cache(
  async (limit: number): Promise<StudyNewsItem[]> => {
    const { data } = await createAdminClient()
      .from("study_news_items")
      .select(SELECT)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map(mapRow);
  },
  ["study-news-published"],
  { revalidate: 600, tags: [STUDY_NEWS_CACHE_TAG] },
);

/** slug 단건(게시분만). */
export const getNewsBySlug = unstable_cache(
  async (slug: string): Promise<StudyNewsItem | null> => {
    const { data } = await createAdminClient()
      .from("study_news_items")
      .select(SELECT)
      .eq("status", "published")
      .eq("slug", slug)
      .maybeSingle();
    return data ? mapRow(data) : null;
  },
  ["study-news-by-slug"],
  { revalidate: 600, tags: [STUDY_NEWS_CACHE_TAG] },
);

/** sitemap 용 slug 목록(게시분). */
export const getPublishedSlugs = unstable_cache(
  async (limit: number): Promise<{ slug: string; publishedAt: string | null }[]> => {
    const { data } = await createAdminClient()
      .from("study_news_items")
      .select("slug,published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((r) => ({ slug: r.slug, publishedAt: r.published_at }));
  },
  ["study-news-slugs"],
  { revalidate: 600, tags: [STUDY_NEWS_CACHE_TAG] },
);
