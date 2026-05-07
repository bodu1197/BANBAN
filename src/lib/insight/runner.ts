import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import type { GenericRunResult } from "@/lib/cron-jobs/types";
import {
  generateInsight,
  buildInsightSlug,
  type InsightArtistContext,
} from "./generator";

interface ArtistRow {
  id: string;
  title: string | null;
  type_artist: string | null;
  region_id: string | null;
  portfolio_media_count: number | null;
}

async function fetchRegionName(regionId: string | null): Promise<string | null> {
  if (!regionId) return null;
  const supabase = createAdminClient();
  const { data } = await supabase.from("regions").select("name").eq("id", regionId).single();
  return (data as { name: string } | null)?.name ?? null;
}

async function fetchArtistPortfolioIds(artistId: string): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("portfolios")
    .select("id")
    .eq("artist_id", artistId)
    .is("deleted_at", null)
    .limit(50);
  return ((data ?? []) as { id: string }[]).map((p) => p.id);
}

async function fetchTopSpecialties(portfolioIds: string[]): Promise<string[]> {
  if (portfolioIds.length === 0) return [];
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- categorizables not in generated types
  const { data } = await (supabase as any)
    .from("categorizables")
    .select("categories(name)")
    .eq("categorizable_type", "portfolio")
    .in("categorizable_id", portfolioIds);
  const counts = new Map<string, number>();
  for (const c of (data ?? []) as { categories: { name: string } | null }[]) {
    const name = c.categories?.name;
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([n]) => n);
}

async function fetchCoverUrl(portfolioId: string | undefined): Promise<string | null> {
  if (!portfolioId) return null;
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

async function buildContext(row: ArtistRow): Promise<InsightArtistContext> {
  const portfolioIds = await fetchArtistPortfolioIds(row.id);
  const [regionName, specialties, coverUrl] = await Promise.all([
    fetchRegionName(row.region_id),
    fetchTopSpecialties(portfolioIds),
    fetchCoverUrl(portfolioIds[0]),
  ]);
  return {
    artist_id: row.id,
    artist_name: row.title ?? "익명 아티스트",
    type_artist: row.type_artist ?? "SEMI_PERMANENT",
    region_name: regionName,
    portfolio_count: row.portfolio_media_count ?? 0,
    specialties,
    cover_image_url: coverUrl,
  };
}

async function pickArtist(
  overrideId: string | null,
): Promise<{ row: ArtistRow | null; remaining: number }> {
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- artist_insights not in generated types
  const { data: existing } = await (supabase as any)
    .from("artist_insights")
    .select("artist_id");
  const existingSet = new Set(
    ((existing ?? []) as { artist_id: string }[]).map((r) => r.artist_id),
  );

  const { count: total } = await supabase
    .from("artists")
    .select("id", { count: "exact", head: true })
    .not("approved_at", "is", null)
    .is("deleted_at", null);
  const remaining = Math.max(0, (total ?? 0) - existingSet.size);

  if (overrideId) {
    const { data } = await supabase
      .from("artists")
      .select("id, title, type_artist, region_id, portfolio_media_count")
      .eq("id", overrideId)
      .single();
    return { row: (data as ArtistRow | null) ?? null, remaining };
  }

  // Bias toward artists with most portfolios (best content for SEO)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- portfolio_media_count column not in generated types
  const { data } = await (supabase as any)
    .from("artists")
    .select("id, title, type_artist, region_id, portfolio_media_count")
    .not("approved_at", "is", null)
    .is("deleted_at", null)
    .order("portfolio_media_count", { ascending: false })
    .limit(300);
  const candidates = (data ?? []) as ArtistRow[];
  const next = candidates.find((a) => !existingSet.has(a.id)) ?? null;
  return { row: next, remaining };
}

async function generateAndStore(
  ctx: InsightArtistContext,
): Promise<{ ok: true; slug: string; title: string } | { ok: false; error: string }> {
  const insight = await generateInsight(ctx);
  const slug = buildInsightSlug(ctx.artist_name, ctx.artist_id);
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- artist_insights not in generated types
  const { error } = await (supabase as any).from("artist_insights").upsert(
    {
      artist_id: ctx.artist_id,
      slug,
      title: insight.title,
      content: insight.content,
      meta_description: insight.meta_description,
      summary: insight.summary,
      tags: insight.tags,
      cover_image_url: ctx.cover_image_url,
      artist_name: ctx.artist_name,
      portfolio_count: ctx.portfolio_count,
      specialties: insight.specialties,
      published: true,
    },
    { onConflict: "artist_id" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true, slug, title: insight.title };
}

export async function runInsightGeneration(
  overrideId: string | null,
): Promise<GenericRunResult> {
  const { row, remaining } = await pickArtist(overrideId);
  if (!row) {
    return { ok: true, done: true, message: "더 이상 생성할 아티스트가 없습니다" };
  }
  try {
    const ctx = await buildContext(row);
    const result = await generateAndStore(ctx);
    if (!result.ok) return { ok: false, error: result.error };
    revalidateTag("artist-insights", { expire: 0 });
    return {
      ok: true,
      id: row.id,
      title: result.title,
      href: `/artist-insight/${result.slug}`,
      remaining: Math.max(0, remaining - (overrideId ? 0 : 1)),
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
