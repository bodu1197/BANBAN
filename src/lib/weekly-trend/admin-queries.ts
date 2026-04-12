import { createAdminClient } from "@/lib/supabase/server";
import type { GenericCronStatus } from "@/lib/cron-jobs/types";
import { nextWeeklyMondayUtc } from "@/lib/cron-jobs/admin-guard";

interface TrendRow {
  id: string;
  slug: string;
  title: string;
  week_start: string;
  total_likes: number;
  view_count: number | null;
  published_at: string;
}

export async function fetchWeeklyTrendCronStatus(): Promise<GenericCronStatus> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- weekly_trends not in generated types
  const { data } = await (supabase as any)
    .from("weekly_trends")
    .select("id, slug, title, week_start, total_likes, view_count, published_at")
    .eq("published", true)
    .order("week_start", { ascending: false })
    .limit(20);
  const rows = (data ?? []) as TrendRow[];

  return {
    feature: "주간 트렌드",
    total: null,
    doneCount: rows.length,
    remaining: null,
    progressPct: null,
    lastDoneAt: rows[0]?.published_at ?? null,
    nextRunAt: nextWeeklyMondayUtc(new Date()).toISOString(),
    cronSchedule: "0 5 * * 1 (UTC) = 매주 월요일 14:00 KST",
    envOk: [
      { name: "OPENAI_API_KEY", ok: Boolean(process.env.OPENAI_API_KEY?.trim()) },
      { name: "CRON_SECRET", ok: Boolean(process.env.CRON_SECRET?.trim()) },
    ],
    recentItems: rows.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.week_start,
      publishedAt: r.published_at,
      viewCount: r.view_count,
      href: `/weekly-trend/${r.slug}`,
    })),
    upcomingItems: [],
    categoryBreakdown: [],
  };
}
