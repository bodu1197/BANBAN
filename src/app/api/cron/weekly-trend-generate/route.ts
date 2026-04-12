import { NextRequest, NextResponse } from "next/server";
import { runWeeklyTrendGeneration } from "@/lib/weekly-trend/runner";
import { checkCronSecret } from "@/lib/cron-jobs/admin-guard";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = checkCronSecret(request.headers.get("authorization"));
  if (denied) return denied;

  const result = await runWeeklyTrendGeneration(null);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
