import "server-only";
import { createClient } from "@/lib/supabase/server";

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
  faq: { question: string; answer: string }[];
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
  const supabase = await createClient();
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

export async function fetchBoardArticleBySlug(
  slug: string,
): Promise<BoardArticle | null> {
  const decoded = decodeURIComponent(slug);
  const supabase = await createClient();
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("encyclopedia_articles")
    .select("slug, published_at")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(2000);

  if (error || !data) return [];
  return data as { slug: string; published_at: string }[];
}
