import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import type { GenericRunResult } from "@/lib/cron-jobs/types";
import {
  generateBlogPost,
  buildBlogSlug,
  type BlogPortfolioContext,
} from "./generator";

interface PortfolioRow {
  id: string;
  title: string | null;
  description: string | null;
  artist_id: string;
  artists: { id: string; title: string | null; region_id: string | null } | null;
}

const PORTFOLIO_SELECT =
  "id, title, description, artist_id, artists(id, title, region_id)";

async function fetchExistingPortfolioIds(): Promise<Set<string>> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- blog_posts not in generated types
  const { data } = await (supabase as any).from("blog_posts").select("portfolio_id");
  return new Set(
    ((data ?? []) as { portfolio_id: string | null }[])
      .map((r) => r.portfolio_id)
      .filter(Boolean) as string[],
  );
}

async function fetchTotalPortfolios(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("portfolios")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);
  return count ?? 0;
}

async function fetchPortfolioRow(
  overrideId: string | null,
  existing: Set<string>,
): Promise<PortfolioRow | null> {
  const supabase = createAdminClient();
  if (overrideId) {
    const { data } = await supabase
      .from("portfolios")
      .select(PORTFOLIO_SELECT)
      .eq("id", overrideId)
      .is("deleted_at", null)
      .single();
    return (data as unknown as PortfolioRow | null) ?? null;
  }
  const { data } = await supabase
    .from("portfolios")
    .select(PORTFOLIO_SELECT)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  const candidates = (data as unknown as PortfolioRow[] | null) ?? [];
  return candidates.find((p) => !existing.has(p.id)) ?? null;
}

async function fetchRegionName(regionId: string | null | undefined): Promise<string | null> {
  if (!regionId) return null;
  const supabase = createAdminClient();
  const { data } = await supabase.from("regions").select("name").eq("id", regionId).single();
  return (data as { name: string } | null)?.name ?? null;
}

async function fetchPortfolioCategory(portfolioId: string): Promise<string | null> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- categorizables not in generated types
  const { data } = await (supabase as any)
    .from("categorizables")
    .select("categories(name)")
    .eq("categorizable_id", portfolioId)
    .eq("categorizable_type", "portfolio")
    .limit(1);
  if (Array.isArray(data) && data[0]?.categories?.name) {
    return data[0].categories.name as string;
  }
  return null;
}

async function fetchPortfolioImage(portfolioId: string): Promise<string | null> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- portfolio_media not in generated types
  const { data } = await (supabase as any)
    .from("portfolio_media")
    .select("storage_path")
    .eq("portfolio_id", portfolioId)
    .order("order_index", { ascending: true })
    .limit(1);
  const sp = Array.isArray(data) ? data[0]?.storage_path : null;
  if (!sp) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()}/storage/v1/object/public/portfolios/${sp}`;
}

async function pickPortfolio(
  overrideId: string | null,
): Promise<{ ctx: BlogPortfolioContext | null; remaining: number }> {
  const [existing, totalCount] = await Promise.all([
    fetchExistingPortfolioIds(),
    fetchTotalPortfolios(),
  ]);
  const remaining = Math.max(0, totalCount - existing.size);

  const row = await fetchPortfolioRow(overrideId, existing);
  if (!row) return { ctx: null, remaining };

  const [regionName, categoryName, imageUrl] = await Promise.all([
    fetchRegionName(row.artists?.region_id),
    fetchPortfolioCategory(row.id),
    fetchPortfolioImage(row.id),
  ]);

  return {
    ctx: {
      portfolio_id: row.id,
      portfolio_title: row.title ?? "타투 작품",
      portfolio_description: row.description,
      artist_id: row.artist_id,
      artist_name: row.artists?.title ?? "익명 아티스트",
      region_name: regionName,
      category_name: categoryName,
      image_url: imageUrl,
    },
    remaining,
  };
}

async function generateAndStore(
  ctx: BlogPortfolioContext,
): Promise<{ ok: true; slug: string; title: string } | { ok: false; error: string }> {
  const post = await generateBlogPost(ctx);
  const slug = buildBlogSlug(post.title, ctx.portfolio_id);
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- blog_posts insert shape
  const { error } = await (supabase as any).from("blog_posts").upsert(
    {
      portfolio_id: ctx.portfolio_id,
      slug,
      title: post.title,
      content: post.content,
      meta_description: post.meta_description,
      tags: post.tags,
      image_url: ctx.image_url,
      artist_name: ctx.artist_name,
      artist_id: ctx.artist_id,
      category_name: ctx.category_name,
      published: true,
    },
    { onConflict: "portfolio_id" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true, slug, title: post.title };
}

export async function runBlogGeneration(
  overrideId: string | null,
): Promise<GenericRunResult> {
  const { ctx, remaining } = await pickPortfolio(overrideId);
  if (!ctx) {
    return { ok: true, done: true, message: "더 이상 생성할 포트폴리오가 없습니다" };
  }
  try {
    const result = await generateAndStore(ctx);
    if (!result.ok) return { ok: false, error: result.error };
    revalidateTag("blog", { expire: 0 });
    return {
      ok: true,
      id: ctx.portfolio_id,
      title: result.title,
      href: `/blog/${result.slug}`,
      remaining: Math.max(0, remaining - (overrideId ? 0 : 1)),
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
