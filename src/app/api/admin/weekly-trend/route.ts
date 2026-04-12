import { NextResponse, type NextRequest } from "next/server";
import { requireAdminOrJsonError } from "@/lib/cron-jobs/admin-guard";
import { fetchWeeklyTrendCronStatus } from "@/lib/weekly-trend/admin-queries";
import { runWeeklyTrendGeneration } from "@/lib/weekly-trend/runner";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(): Promise<NextResponse> {
  const denied = await requireAdminOrJsonError();
  if (denied) return denied;
  return NextResponse.json(await fetchWeeklyTrendCronStatus());
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const denied = await requireAdminOrJsonError();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as { item_id?: string };
  const result = await runWeeklyTrendGeneration(body.item_id ?? null);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
