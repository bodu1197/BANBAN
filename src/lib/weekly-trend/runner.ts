import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import type { GenericRunResult } from "@/lib/cron-jobs/types";
import {
  generateWeeklyTrend,
  type WeeklyTrendContext,
  type WeeklyTrendItem,
} from "./generator";

/**
 * Returns Monday of the week containing `now`. Date-only (UTC).
 */
function mondayOf(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface PortfolioRow {
  id: string;
  title: string | null;
  likes_count: number | null;
  artist_id: string;
}

async function fetchTopPortfolios(
  weekStartIso: string,
  weekEndIso: string,
): Promise<PortfolioRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("portfolios")
    .select("id, title, likes_count, artist_id")
    .gte("created_at", weekStartIso)
    .lt("created_at", weekEndIso)
    .is("deleted_at", null)
    .order("likes_count", { ascending: false })
    .limit(12);
  return (data ?? []) as PortfolioRow[];
}

async function fetchArtistMap(artistIds: string[]): Promise<Map<string, string | null>> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("artists").select("id, title").in("id", artistIds);
  return new Map(
    ((data ?? []) as { id: string; title: string | null }[]).map((a) => [a.id, a.title]),
  );
}

async function fetchMediaMap(portfolioIds: string[]): Promise<Map<string, string>> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- portfolio_media not in generated types
  const { data } = await (supabase as any)
    .from("portfolio_media")
    .select("portfolio_id, storage_path, order_index")
    .in("portfolio_id", portfolioIds)
    .order("order_index", { ascending: true });
  const map = new Map<string, string>();
  for (const m of (data ?? []) as { portfolio_id: string; storage_path: string }[]) {
    if (!map.has(m.portfolio_id)) map.set(m.portfolio_id, m.storage_path);
  }
  return map;
}

async function fetchCategoryMap(portfolioIds: string[]): Promise<Map<string, string>> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- categorizables not in generated types
  const { data } = await (supabase as any)
    .from("categorizables")
    .select("categorizable_id, categories(name)")
    .eq("categorizable_type", "portfolio")
    .in("categorizable_id", portfolioIds);
  const map = new Map<string, string>();
  for (const c of (data ?? []) as { categorizable_id: string; categories: { name: string } | null }[]) {
    if (!map.has(c.categorizable_id) && c.categories?.name) {
      map.set(c.categorizable_id, c.categories.name);
    }
  }
  return map;
}

async function enrichItems(rows: PortfolioRow[]): Promise<WeeklyTrendItem[]> {
  if (rows.length === 0) return [];
  const artistIds = Array.from(new Set(rows.map((r) => r.artist_id)));
  const portfolioIds = rows.map((r) => r.id);
  const [artistMap, mediaMap, catMap] = await Promise.all([
    fetchArtistMap(artistIds),
    fetchMediaMap(portfolioIds),
    fetchCategoryMap(portfolioIds),
  ]);
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return rows.map((r) => ({
    portfolio_id: r.id,
    title: r.title ?? "타투 작품",
    artist_name: artistMap.get(r.artist_id) ?? "익명",
    image_url: mediaMap.has(r.id)
      ? `${baseUrl}/storage/v1/object/public/portfolios/${mediaMap.get(r.id)}`
      : null,
    likes: r.likes_count ?? 0,
    category: catMap.get(r.id) ?? null,
  }));
}

function topCategories(items: WeeklyTrendItem[]): string[] {
  const counts = new Map<string, number>();
  for (const it of items) {
    if (it.category) counts.set(it.category, (counts.get(it.category) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([n]) => n);
}

async function isAlreadyGenerated(weekStart: string): Promise<boolean> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- weekly_trends not in generated types
  const { data } = await (supabase as any)
    .from("weekly_trends")
    .select("id")
    .eq("week_start", weekStart)
    .limit(1)
    .maybeSingle();
  return !!data;
}

async function upsertTrend(
  weekStartStr: string,
  weekEndStr: string,
  items: WeeklyTrendItem[],
): Promise<GenericRunResult> {
  const ctx: WeeklyTrendContext = {
    week_start: weekStartStr,
    week_end: weekEndStr,
    items,
    total_likes: items.reduce((sum, it) => sum + it.likes, 0),
    top_categories: topCategories(items),
  };
  const trend = await generateWeeklyTrend(ctx);
  const slug = `weekly-trend-${weekStartStr}`;

  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- weekly_trends not in generated types
  const { error } = await (supabase as any).from("weekly_trends").upsert(
    {
      week_start: weekStartStr,
      slug,
      title: trend.title,
      intro: trend.intro,
      meta_description: trend.meta_description,
      cover_image_url: items[0]?.image_url ?? null,
      items,
      total_likes: ctx.total_likes,
      published: true,
    },
    { onConflict: "week_start" },
  );
  if (error) return { ok: false, error: error.message };

  revalidateTag("weekly-trend", { expire: 0 });
  return {
    ok: true,
    id: weekStartStr,
    title: trend.title,
    href: `/weekly-trend/${slug}`,
    remaining: null,
  };
}

export async function runWeeklyTrendGeneration(
  overrideKey: string | null,
): Promise<GenericRunResult> {
  const targetMonday = overrideKey ? new Date(`${overrideKey}T00:00:00Z`) : mondayOf(new Date());
  const weekStart = overrideKey ? targetMonday : new Date(targetMonday.getTime() - 7 * 86400_000);
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400_000);
  const weekStartStr = ymd(weekStart);
  const weekEndStr = ymd(weekEnd);

  if (!overrideKey && await isAlreadyGenerated(weekStartStr)) {
    return { ok: true, done: true, message: `${weekStartStr} 주차는 이미 생성됨` };
  }

  try {
    const rows = await fetchTopPortfolios(weekStart.toISOString(), weekEnd.toISOString());
    if (rows.length === 0) {
      return { ok: false, error: `${weekStartStr} 주차에 포트폴리오가 없습니다` };
    }
    const items = await enrichItems(rows);
    return await upsertTrend(weekStartStr, weekEndStr, items);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
