/**
 * Generic shape returned by every auto-generation cron's admin status
 * endpoint. Lets the dashboard component render any of them uniformly.
 */
export interface GenericCronStatus {
  feature: string;            // "백과사전", "블로그" etc — page heading
  total: number | null;       // pool size; null = unbounded (e.g. infinite location combos)
  doneCount: number;
  remaining: number | null;
  progressPct: number | null; // 0..100
  lastDoneAt: string | null;
  nextRunAt: string;          // ISO
  cronSchedule: string;       // human-readable
  envOk: { name: string; ok: boolean }[];
  recentItems: GenericRecentItem[];
  upcomingItems: GenericUpcomingItem[];
  categoryBreakdown: { category: string; total: number; done: number }[];
}

export interface GenericRecentItem {
  id: string;
  title: string;
  category: string | null;
  publishedAt: string;
  viewCount: number | null;
  href: string | null;       // public URL to open in new tab
}

export interface GenericUpcomingItem {
  id: string;
  label: string;             // e.g. "서울 강남구 × 블랙앤그레이"
  sub: string | null;        // optional secondary line
}

export type GenericRunResult =
  | { ok: true; id: string; title: string; href?: string; remaining: number | null }
  | { ok: true; done: true; message: string }
  | { ok: false; error: string };
