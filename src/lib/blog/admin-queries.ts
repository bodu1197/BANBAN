import { createAdminClient } from "@/lib/supabase/server";
import type { GenericCronStatus } from "@/lib/cron-jobs/types";
import { nextDailyMidnightUtc } from "@/lib/cron-jobs/admin-guard";

interface BlogRow {
  id: string;
  slug: string;
  title: string;
  category_name: string | null;
  created_at: string;
  portfolio_id: string | null;
}

async function fetchRecent(): Promise<BlogRow[]> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- blog_posts not in generated types
  const { data } = await (supabase as any)
    .from("blog_posts")
    .select("id, slug, title, category_name, created_at, portfolio_id")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as BlogRow[];
}

async function fetchCounts(): Promise<{ done: number; total: number }> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- blog_posts not in generated types
  const { count: done } = await (supabase as any)
    .from("blog_posts")
    .select("id", { count: "exact", head: true })
    .eq("published", true);
  const { count: total } = await supabase
    .from("portfolios")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);
  return { done: done ?? 0, total: total ?? 0 };
}

async function fetchCategoryBreakdown(): Promise<GenericCronStatus["categoryBreakdown"]> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- blog_posts not in generated types
  const { data } = await (supabase as any)
    .from("blog_posts")
    .select("category_name")
    .eq("published", true);
  const counts = new Map<string, number>();
  for (const r of (data ?? []) as { category_name: string | null }[]) {
    const k = r.category_name ?? "기타";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([category, done]) => ({ category, total: done, done }))
    .sort((a, b) => b.done - a.done)
    .slice(0, 10);
}

async function fetchUpcoming(): Promise<GenericCronStatus["upcomingItems"]> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- blog_posts not in generated types
  const { data: existing } = await (supabase as any)
    .from("blog_posts")
    .select("portfolio_id");
  const existingSet = new Set(
    ((existing ?? []) as { portfolio_id: string | null }[])
      .map((r) => r.portfolio_id)
      .filter(Boolean) as string[],
  );
  const { data } = await supabase
    .from("portfolios")
    .select("id, title")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = (data ?? []) as { id: string; title: string | null }[];
  return rows
    .filter((p) => !existingSet.has(p.id))
    .slice(0, 10)
    .map((p) => ({ id: p.id, label: p.title ?? "(제목 없음)", sub: null }));
}

export async function fetchBlogCronStatus(): Promise<GenericCronStatus> {
  const [recent, counts, categoryBreakdown, upcoming] = await Promise.all([
    fetchRecent(),
    fetchCounts(),
    fetchCategoryBreakdown(),
    fetchUpcoming(),
  ]);
  const remaining = Math.max(0, counts.total - counts.done);
  const progressPct = counts.total > 0
    ? Math.round((counts.done / counts.total) * 1000) / 10
    : 0;

  return {
    feature: "블로그",
    total: counts.total,
    doneCount: counts.done,
    remaining,
    progressPct,
    lastDoneAt: recent[0]?.created_at ?? null,
    nextRunAt: nextDailyMidnightUtc(new Date()).toISOString(),
    cronSchedule: "0 2 * * * (UTC) = 매일 11:00 KST · 1회 5건",
    envOk: [
      { name: "OPENAI_API_KEY", ok: Boolean(process.env.OPENAI_API_KEY?.trim()) },
      { name: "CRON_SECRET", ok: Boolean(process.env.CRON_SECRET?.trim()) },
    ],
    recentItems: recent.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category_name,
      publishedAt: r.created_at,
      viewCount: null,
      href: `/blog/${r.slug}`,
    })),
    upcomingItems: upcoming,
    categoryBreakdown,
  };
}
