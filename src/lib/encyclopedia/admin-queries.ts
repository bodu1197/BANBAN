import { createAdminClient } from "@/lib/supabase/server";
import { ENCYCLOPEDIA_TOPICS } from "./topics";

export interface EncyclopediaCronStatus {
  total: number;
  publishedCount: number;
  remaining: number;
  progressPct: number;
  lastPublishedAt: string | null;
  nextRunAt: string; // ISO, UTC
  cronSchedule: string;
  openAiConfigured: boolean;
  cronSecretConfigured: boolean;
  recentArticles: {
    topic_id: number;
    slug: string;
    title: string;
    category: string;
    published_at: string;
    view_count: number;
    reading_time_minutes: number;
  }[];
  upcomingTopics: {
    id: number;
    category: string;
    title: string;
    keyword: string;
  }[];
  categoryBreakdown: {
    category: string;
    total: number;
    published: number;
  }[];
}

/**
 * Returns the next Vercel Cron run for schedule `0 0 * * *` (daily UTC 00:00
 * = KST 09:00). We don't parse arbitrary cron expressions; the schedule is
 * hard-coded alongside `vercel.json`.
 */
function computeNextDailyMidnightUtc(now: Date): Date {
  const next = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0, 0, 0, 0,
  ));
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}

type ArticleRow = EncyclopediaCronStatus["recentArticles"][number];

async function fetchAllArticleRows(): Promise<ArticleRow[]> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types
  const { data } = await (supabase as any)
    .from("encyclopedia_articles")
    .select("topic_id, slug, title, category, published_at, view_count, reading_time_minutes")
    .order("published_at", { ascending: false });
  return (data ?? []) as ArticleRow[];
}

function buildCategoryBreakdown(
  rows: ArticleRow[],
): EncyclopediaCronStatus["categoryBreakdown"] {
  const totalPerCategory = new Map<string, number>();
  for (const t of ENCYCLOPEDIA_TOPICS) {
    totalPerCategory.set(t.category, (totalPerCategory.get(t.category) ?? 0) + 1);
  }
  const publishedPerCategory = new Map<string, number>();
  for (const r of rows) {
    publishedPerCategory.set(r.category, (publishedPerCategory.get(r.category) ?? 0) + 1);
  }
  return Array.from(totalPerCategory.entries())
    .map(([category, t]) => ({
      category,
      total: t,
      published: publishedPerCategory.get(category) ?? 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export async function fetchEncyclopediaCronStatus(): Promise<EncyclopediaCronStatus> {
  const rows = await fetchAllArticleRows();
  const publishedCount = rows.length;
  const publishedIds = new Set(rows.map((r) => r.topic_id));

  const total = ENCYCLOPEDIA_TOPICS.length;
  const remaining = total - publishedCount;
  const progressPct = total > 0 ? Math.round((publishedCount / total) * 1000) / 10 : 0;

  const upcomingTopics = ENCYCLOPEDIA_TOPICS
    .filter((t) => !publishedIds.has(t.id))
    .slice(0, 10)
    .map((t) => ({ id: t.id, category: t.category, title: t.title, keyword: t.keyword }));

  const categoryBreakdown = buildCategoryBreakdown(rows);

  return {
    total,
    publishedCount,
    remaining,
    progressPct,
    lastPublishedAt: rows[0]?.published_at ?? null,
    nextRunAt: computeNextDailyMidnightUtc(new Date()).toISOString(),
    cronSchedule: "0 0 * * * (UTC) = 매일 09:00 KST",
    openAiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    cronSecretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    recentArticles: rows.slice(0, 20),
    upcomingTopics,
    categoryBreakdown,
  };
}
