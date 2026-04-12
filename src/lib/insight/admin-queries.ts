import { createAdminClient } from "@/lib/supabase/server";
import type { GenericCronStatus } from "@/lib/cron-jobs/types";
import { nextDailyMidnightUtc } from "@/lib/cron-jobs/admin-guard";

interface InsightRow {
  id: string;
  slug: string;
  title: string;
  artist_name: string | null;
  created_at: string;
  specialties: string[] | null;
}

async function fetchRecent(): Promise<InsightRow[]> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- artist_insights not in generated types
  const { data } = await (supabase as any)
    .from("artist_insights")
    .select("id, slug, title, artist_name, created_at, specialties")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as InsightRow[];
}

async function fetchCounts(): Promise<{ done: number; total: number }> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- artist_insights not in generated types
  const { count: done } = await (supabase as any)
    .from("artist_insights")
    .select("id", { count: "exact", head: true })
    .eq("published", true);
  const { count: total } = await supabase
    .from("artists")
    .select("id", { count: "exact", head: true })
    .not("approved_at", "is", null)
    .is("deleted_at", null);
  return { done: done ?? 0, total: total ?? 0 };
}

async function fetchUpcoming(): Promise<GenericCronStatus["upcomingItems"]> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- artist_insights not in generated types
  const { data: existing } = await (supabase as any)
    .from("artist_insights")
    .select("artist_id");
  const existingSet = new Set(
    ((existing ?? []) as { artist_id: string }[]).map((r) => r.artist_id),
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- portfolio_media_count column not in generated types
  const { data } = await (supabase as any)
    .from("artists")
    .select("id, title, portfolio_media_count")
    .not("approved_at", "is", null)
    .is("deleted_at", null)
    .order("portfolio_media_count", { ascending: false })
    .limit(50);
  const rows = (data ?? []) as { id: string; title: string | null; portfolio_media_count: number | null }[];
  return rows
    .filter((a) => !existingSet.has(a.id))
    .slice(0, 10)
    .map((a) => ({
      id: a.id,
      label: a.title ?? "(이름 없음)",
      sub: `포트폴리오 ${a.portfolio_media_count ?? 0}점`,
    }));
}

export async function fetchInsightCronStatus(): Promise<GenericCronStatus> {
  const [recent, counts, upcoming] = await Promise.all([
    fetchRecent(),
    fetchCounts(),
    fetchUpcoming(),
  ]);
  const remaining = Math.max(0, counts.total - counts.done);
  const progressPct = counts.total > 0
    ? Math.round((counts.done / counts.total) * 1000) / 10
    : 0;

  return {
    feature: "아티스트 인사이트",
    total: counts.total,
    doneCount: counts.done,
    remaining,
    progressPct,
    lastDoneAt: recent[0]?.created_at ?? null,
    nextRunAt: nextDailyMidnightUtc(new Date()).toISOString(),
    cronSchedule: "0 3 * * * (UTC) = 매일 12:00 KST · 1회 2건",
    envOk: [
      { name: "OPENAI_API_KEY", ok: Boolean(process.env.OPENAI_API_KEY?.trim()) },
      { name: "CRON_SECRET", ok: Boolean(process.env.CRON_SECRET?.trim()) },
    ],
    recentItems: recent.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.artist_name,
      publishedAt: r.created_at,
      viewCount: null,
      href: `/artist-insight/${r.slug}`,
    })),
    upcomingItems: upcoming,
    categoryBreakdown: [],
  };
}
