import { createAdminClient } from "@/lib/supabase/server";
import type { GenericCronStatus } from "@/lib/cron-jobs/types";
import { nextDailyMidnightUtc } from "@/lib/cron-jobs/admin-guard";
import { LOCATION_SEO_STYLES } from "./styles";

interface PageRow {
  id: string;
  slug: string;
  title: string;
  region_name: string;
  style: string;
  published_at: string;
  view_count: number | null;
}

async function fetchRecent(): Promise<PageRow[]> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- location_seo_pages not in generated types
  const { data } = await (supabase as any)
    .from("location_seo_pages")
    .select("id, slug, title, region_name, style, published_at, view_count")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(20);
  return (data ?? []) as PageRow[];
}

async function fetchAllStyles(): Promise<Map<string, number>> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- location_seo_pages not in generated types
  const { data } = await (supabase as any)
    .from("location_seo_pages")
    .select("style")
    .eq("published", true);
  const counts = new Map<string, number>();
  for (const r of (data ?? []) as { style: string }[]) {
    counts.set(r.style, (counts.get(r.style) ?? 0) + 1);
  }
  return counts;
}

export async function fetchLocationSeoCronStatus(): Promise<GenericCronStatus> {
  const supabase = createAdminClient();
  const [recent, styleCounts, regionCount, doneCount] = await Promise.all([
    fetchRecent(),
    fetchAllStyles(),
    supabase.from("regions").select("id", { count: "exact", head: true }).then((r) => r.count ?? 0),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- location_seo_pages not in generated types
    (supabase as any)
      .from("location_seo_pages")
      .select("id", { count: "exact", head: true })
      .eq("published", true)
      .then((r: { count: number | null }) => r.count ?? 0),
  ]);

  const total = regionCount * LOCATION_SEO_STYLES.length;
  const remaining = Math.max(0, total - doneCount);
  const progressPct = total > 0 ? Math.round((doneCount / total) * 1000) / 10 : 0;

  const categoryBreakdown = LOCATION_SEO_STYLES.map((style) => ({
    category: style,
    total: regionCount,
    done: styleCounts.get(style) ?? 0,
  })).sort((a, b) => b.done - a.done);

  return {
    feature: "위치×스타일 SEO",
    total,
    doneCount,
    remaining,
    progressPct,
    lastDoneAt: recent[0]?.published_at ?? null,
    nextRunAt: nextDailyMidnightUtc(new Date()).toISOString(),
    cronSchedule: "0 4 * * * (UTC) = 매일 13:00 KST · 1회 2건",
    envOk: [
      { name: "OPENAI_API_KEY", ok: Boolean(process.env.OPENAI_API_KEY?.trim()) },
      { name: "CRON_SECRET", ok: Boolean(process.env.CRON_SECRET?.trim()) },
    ],
    recentItems: recent.map((r) => ({
      id: r.id,
      title: r.title,
      category: `${r.region_name} · ${r.style}`,
      publishedAt: r.published_at,
      viewCount: r.view_count,
      href: `/location-seo/${r.slug}`,
    })),
    upcomingItems: [],
    categoryBreakdown,
  };
}
