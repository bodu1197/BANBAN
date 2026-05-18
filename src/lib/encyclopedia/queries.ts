import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

export async function fetchPublishedTopicIds(): Promise<Set<number>> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types
  const { data } = await (supabase as any)
    .from("encyclopedia_articles")
    .select("topic_id");
  return new Set(((data ?? []) as { topic_id: number }[]).map((r) => r.topic_id));
}

export async function insertEncyclopediaArticle(
  article: Record<string, unknown>,
): Promise<{ id: string } | { error: string }> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types
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
