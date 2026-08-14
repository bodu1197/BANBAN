import "server-only";
import { unstable_cache } from "next/cache";
import { createStaticClient } from "@/lib/supabase/server";
import type { FaqItem } from "@/lib/pages/article-content";

/**
 * 백과 캐시 태그 SSOT. 관리자 API 3곳이 각자 문자열 상수를 갖고 있었다 —
 * 하나만 오타 나면 그 경로의 무효화가 조용히 사라지므로 여기 한 곳에서 export 한다.
 */
export const ENCYCLOPEDIA_CACHE_TAG = "encyclopedia";

export interface BoardArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  content: string;
  excerpt: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  inline_images: { url: string; alt?: string }[];
  meta_title: string;
  meta_description: string;
  keywords: string[];
  tags: string[];
  faq: FaqItem[];
  published: boolean;
  published_at: string;
  view_count: number;
  reading_time_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface BoardListItem {
  id: string;
  slug: string;
  title: string;
  category: string;
  cover_image_url: string | null;
  published_at: string;
  view_count: number;
}

const LIST_FIELDS =
  "id, slug, title, category, cover_image_url, published_at, view_count";

export async function fetchBoardList(options: {
  limit?: number;
  offset?: number;
}): Promise<{ items: BoardListItem[]; count: number }> {
  const supabase = createStaticClient();
  const limit = options.limit ?? 30;
  const offset = options.offset ?? 0;

  const { data, count, error } = await supabase
    .from("encyclopedia_articles")
    .select(LIST_FIELDS, { count: "exact" })
    .eq("published", true)
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { items: [], count: 0 };
  return { items: (data ?? []) as BoardListItem[], count: count ?? 0 };
}

/**
 * 백과 글 단건.
 *
 * ⚠️ `unstable_cache(tags: ENCYCLOPEDIA_CACHE_TAG)` 로 감싸는 이유:
 * 이 페이지가 ISR(300s) 로 바뀌면서, 태그가 없으면 관리자가 글을 고치고
 * `revalidateTag("encyclopedia")` 를 호출해도 페이지 HTML 캐시가 그대로 남아 최대 5분간 옛 글이 나간다
 * (쿠키 클라이언트를 쓰던 시절에는 매 요청 동적이라 이 문제가 없었다 — 캐시 복구가 만든 회귀).
 * `unstable_cache` 의 태그는 페이지 라우트 엔트리까지 전파되므로 둘이 함께 무효화된다.
 */
export const fetchBoardArticleBySlug = unstable_cache(
  fetchBoardArticleBySlugUncached,
  ["board-article-by-slug"],
  { revalidate: 300, tags: [ENCYCLOPEDIA_CACHE_TAG] },
);

async function fetchBoardArticleBySlugUncached(
  slug: string,
): Promise<BoardArticle | null> {
  const decoded = decodeURIComponent(slug);
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("encyclopedia_articles")
    .select("*")
    .eq("slug", decoded)
    .eq("published", true)
    .single();

  if (error) return null;
  // Supabase 의 Json 타입(inline_images, faq 등)을 우리 도메인 인터페이스로 변환할 때
  // 이중 cast 가 불가피 — TypeScript 가 sufficient overlap 보장 못함. 변환 책임은 호출처/검증에 위임.
  return data as unknown as BoardArticle;
}

export async function fetchBoardSlugs(): Promise<
  { slug: string; published_at: string }[]
> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("encyclopedia_articles")
    .select("slug, published_at")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(2000);

  if (error || !data) return [];
  return data as { slug: string; published_at: string }[];
}
