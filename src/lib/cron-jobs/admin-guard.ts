import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Shared admin gate for /api/admin/* cron-management routes.
 * Returns a NextResponse on failure, or null when the request is allowed.
 */
export async function requireAdminOrJsonError(): Promise<NextResponse | null> {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const isAdmin = !!(data as { is_admin: boolean } | null)?.is_admin;
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  return null;
}

/**
 * Compute the next UTC midnight (= 09:00 KST). All our crons fire on
 * the daily UTC schedule, so this is good enough for "next run" UI.
 */
export function nextDailyMidnightUtc(now: Date = new Date()): Date {
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

/**
 * Compute next Monday 00:00 UTC for weekly crons.
 */
export function nextWeeklyMondayUtc(now: Date = new Date()): Date {
  const next = nextDailyMidnightUtc(now);
  while (next.getUTCDay() !== 1) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}

export function checkCronSecret(authHeader: string | null): NextResponse | null {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (authHeader?.trim() !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
