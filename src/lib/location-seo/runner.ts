import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import type { GenericRunResult } from "@/lib/cron-jobs/types";
import { LOCATION_SEO_STYLES } from "./styles";
import {
  generateLocationSeoPage,
  buildLocationSeoSlug,
  type LocationSeoContext,
} from "./generator";

interface RegionRow {
  id: string;
  name: string;
}

async function fetchAllRegions(): Promise<RegionRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("regions")
    .select("id, name")
    .order("order_index", { ascending: true });
  return (data ?? []) as RegionRow[];
}

interface ExistingRow {
  region_id: string;
  style: string;
}

async function fetchExisting(): Promise<Set<string>> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- location_seo_pages not in generated types
  const { data } = await (supabase as any)
    .from("location_seo_pages")
    .select("region_id, style");
  const set = new Set<string>();
  for (const r of (data ?? []) as ExistingRow[]) {
    set.add(`${r.region_id}::${r.style}`);
  }
  return set;
}

async function pickNext(
  overrideKey: string | null,
): Promise<{ region: RegionRow; style: string } | null> {
  const regions = await fetchAllRegions();
  const existing = await fetchExisting();

  if (overrideKey) {
    // override format: "<region_id>::<style>"
    const [rid, style] = overrideKey.split("::");
    const region = regions.find((r) => r.id === rid);
    if (region && style) return { region, style };
    return null;
  }

  // iterate styles outer, regions inner — gives early variety
  for (const style of LOCATION_SEO_STYLES) {
    for (const region of regions) {
      if (!existing.has(`${region.id}::${style}`)) {
        return { region, style };
      }
    }
  }
  return null;
}

interface ArtistRow {
  id: string;
  title: string | null;
}

async function fetchCategoryId(style: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("categories")
    .select("id")
    .eq("name", style)
    .eq("artist_type", "SEMI_PERMANENT")
    .limit(1)
    .single();
  return (data as { id: string } | null)?.id ?? null;
}

async function fetchArtistsInRegion(regionId: string): Promise<ArtistRow[]> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- portfolio_media_count column not in generated types
  const { data } = await (supabase as any)
    .from("artists")
    .select("id, title")
    .eq("region_id", regionId)
    .not("approved_at", "is", null)
    .is("deleted_at", null)
    .order("portfolio_media_count", { ascending: false })
    .limit(50);
  return (data ?? []) as ArtistRow[];
}

async function fetchMatchingPortfolioIds(
  artistIds: string[],
  categoryId: string,
): Promise<string[]> {
  if (artistIds.length === 0) return [];
  const supabase = createAdminClient();
  const { data: pf } = await supabase
    .from("portfolios")
    .select("id")
    .in("artist_id", artistIds)
    .is("deleted_at", null)
    .limit(500);
  const pfIds = ((pf ?? []) as { id: string }[]).map((p) => p.id);
  if (pfIds.length === 0) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- categorizables not in generated types
  const { data: catz } = await (supabase as any)
    .from("categorizables")
    .select("categorizable_id")
    .eq("categorizable_type", "portfolio")
    .eq("category_id", categoryId)
    .in("categorizable_id", pfIds);
  return ((catz ?? []) as { categorizable_id: string }[]).map((c) => c.categorizable_id);
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

async function buildContext(
  region: RegionRow,
  style: string,
): Promise<LocationSeoContext> {
  const [categoryId, artists] = await Promise.all([
    fetchCategoryId(style),
    fetchArtistsInRegion(region.id),
  ]);

  let portfolioCount = 0;
  let coverUrl: string | null = null;
  if (categoryId && artists.length > 0) {
    const matchingPfIds = await fetchMatchingPortfolioIds(
      artists.map((a) => a.id),
      categoryId,
    );
    portfolioCount = matchingPfIds.length;
    coverUrl = await fetchCoverUrl(matchingPfIds[0]);
  }

  return {
    region_id: region.id,
    region_name: region.name,
    style,
    artist_count: artists.length,
    portfolio_count: portfolioCount,
    top_artist_names: artists.slice(0, 5).map((a) => a.title ?? "").filter(Boolean),
    cover_image_url: coverUrl,
  };
}

async function generateAndStore(
  ctx: LocationSeoContext,
): Promise<{ ok: true; slug: string; title: string } | { ok: false; error: string }> {
  const page = await generateLocationSeoPage(ctx);
  const slug = buildLocationSeoSlug(ctx.region_name, ctx.style);
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- location_seo_pages not in generated types
  const { error } = await (supabase as any).from("location_seo_pages").upsert(
    {
      region_id: ctx.region_id,
      region_name: ctx.region_name,
      style: ctx.style,
      slug,
      title: page.title,
      excerpt: page.excerpt,
      content: page.content,
      meta_title: page.meta_title,
      meta_description: page.meta_description,
      keywords: page.keywords,
      cover_image_url: ctx.cover_image_url,
      cover_image_alt: `${ctx.region_name} ${ctx.style} 반영구`,
      faq: page.faq,
      artist_count: ctx.artist_count,
      portfolio_count: ctx.portfolio_count,
      reading_time_minutes: page.reading_time_minutes,
      published: true,
    },
    { onConflict: "region_id,style" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true, slug, title: page.title };
}

export async function runLocationSeoGeneration(
  overrideKey: string | null,
): Promise<GenericRunResult> {
  const next = await pickNext(overrideKey);
  if (!next) {
    return { ok: true, done: true, message: "모든 지역×스타일 조합이 생성되었습니다" };
  }
  try {
    const ctx = await buildContext(next.region, next.style);
    const result = await generateAndStore(ctx);
    if (!result.ok) return { ok: false, error: result.error };
    revalidateTag("location-seo", { expire: 0 });
    return {
      ok: true,
      id: `${next.region.id}::${next.style}`,
      title: result.title,
      href: `/location-seo/${result.slug}`,
      remaining: null,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
