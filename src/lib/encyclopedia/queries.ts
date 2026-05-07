import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface EncyclopediaArticle {
  id: string;
  topic_id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  meta_title: string;
  meta_description: string;
  keywords: string[];
  tags: string[];
  category: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  inline_images: { url: string; alt: string; caption?: string }[];
  faq: { question: string; answer: string }[];
  reading_time_minutes: number;
  published: boolean;
  published_at: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface EncyclopediaListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  cover_image_url: string | null;
  reading_time_minutes: number;
  published_at: string;
  view_count: number;
}

const LIST_FIELDS =
  "id, slug, title, excerpt, category, cover_image_url, reading_time_minutes, published_at, view_count";

export async function fetchEncyclopediaList(options: {
  limit?: number;
  offset?: number;
  category?: string | null;
}): Promise<{ items: EncyclopediaListItem[]; count: number }> {
  const supabase = await createClient();
  const limit = options.limit ?? 30;
  const offset = options.offset ?? 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
  let query = (supabase as any)
    .from("encyclopedia_articles")
    .select(LIST_FIELDS, { count: "exact" })
    .eq("published", true)
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.category) {
    query = query.eq("category", options.category);
  }

  const { data, count, error } = await query;
  if (error) {
    // eslint-disable-next-line no-console
    console.error(`fetchEncyclopediaList: ${error.message}`);
    return { items: [], count: 0 };
  }
  return {
    items: (data ?? []) as EncyclopediaListItem[],
    count: count ?? 0,
  };
}

export async function fetchEncyclopediaArticleBySlug(
  slug: string,
): Promise<EncyclopediaArticle | null> {
  const decoded = decodeURIComponent(slug);
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
  const { data, error } = await (supabase as any)
    .from("encyclopedia_articles")
    .select("*")
    .eq("slug", decoded)
    .eq("published", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    // eslint-disable-next-line no-console
    console.error(`fetchEncyclopediaArticleBySlug: ${error.message}`);
    return null;
  }
  return data as EncyclopediaArticle;
}

export async function fetchEncyclopediaCategories(): Promise<
  { category: string; count: number }[]
> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
  const { data, error } = await (supabase as any)
    .from("encyclopedia_articles")
    .select("category")
    .eq("published", true);

  if (error || !data) return [];

  const counts = new Map<string, number>();
  for (const row of data as { category: string }[]) {
    counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export async function fetchEncyclopediaSlugs(): Promise<
  { slug: string; published_at: string }[]
> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
  const { data, error } = await (supabase as any)
    .from("encyclopedia_articles")
    .select("slug, published_at")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(2000);

  if (error || !data) return [];
  return data as { slug: string; published_at: string }[];
}

export async function fetchPublishedTopicIds(): Promise<Set<number>> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
  const { data } = await (supabase as any)
    .from("encyclopedia_articles")
    .select("topic_id");
  return new Set(((data ?? []) as { topic_id: number }[]).map((r) => r.topic_id));
}

export async function insertEncyclopediaArticle(
  article: Omit<EncyclopediaArticle, "id" | "created_at" | "updated_at" | "view_count" | "published_at"> & {
    published_at?: string;
  },
): Promise<{ id: string } | { error: string }> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
  const { data, error } = await (supabase as any)
    .from("encyclopedia_articles")
    .insert(article)
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: (data as { id: string }).id };
}

async function findCategoryPortfolioIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase admin client
  supabase: any,
  cleaned: string,
  limit: number,
): Promise<string[]> {
  const { data: catRows } = await supabase
    .from("categories")
    .select("id")
    .ilike("name", `%${cleaned}%`)
    .limit(5);
  if (!catRows || catRows.length === 0) return [];

  const catIds = (catRows as { id: string }[]).map((c) => c.id);
  const { data: bridge } = await supabase
    .from("categorizables")
    .select("categorizable_id")
    .eq("categorizable_type", "portfolio")
    .in("category_id", catIds)
    .limit(limit * 8);
  return Array.from(
    new Set(((bridge ?? []) as { categorizable_id: string }[]).map((b) => b.categorizable_id)),
  );
}

/**
 * Pick portfolio images visually related to a topic keyword.
 * Strategy: match a category by name → categorizables polymorphic bridge →
 * portfolio_media. Falls back to popular recent portfolio media when no
 * category match exists.
 */
export async function pickRelatedPortfolioImages(
  keyword: string,
  limit: number = 4,
): Promise<{ url: string; alt: string }[]> {
  const supabase = createAdminClient();
  const bucketUrl = `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim()}/storage/v1/object/public/portfolios`;
  const cleaned = keyword.replace(/\s*(타투|반영구)\s*$/, "").trim();

  const portfolioIds = await findCategoryPortfolioIds(supabase, cleaned, limit);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- portfolio_media query
  let mediaQuery: any = supabase
    .from("portfolio_media")
    .select("portfolio_id, storage_path, order_index")
    .order("order_index", { ascending: true })
    .limit(limit * 4);

  if (portfolioIds.length > 0) {
    mediaQuery = mediaQuery.in("portfolio_id", portfolioIds);
  }

  const { data: imgs } = await mediaQuery;
  const seen = new Set<string>();
  const out: { url: string; alt: string }[] = [];
  for (const row of (imgs ?? []) as { portfolio_id: string; storage_path: string }[]) {
    if (seen.has(row.portfolio_id)) continue;
    seen.add(row.portfolio_id);
    out.push({
      url: `${bucketUrl}/${row.storage_path}`,
      alt: `${keyword} 관련 작품 예시`,
    });
    if (out.length >= limit) break;
  }
  return out;
}
