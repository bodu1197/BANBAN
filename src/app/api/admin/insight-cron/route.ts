import { NextResponse, type NextRequest } from "next/server";
import { requireAdminOrJsonError } from "@/lib/cron-jobs/admin-guard";
import { fetchInsightCronStatus } from "@/lib/insight/admin-queries";
import { runInsightGeneration } from "@/lib/insight/runner";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(): Promise<NextResponse> {
  const denied = await requireAdminOrJsonError();
  if (denied) return denied;
  return NextResponse.json(await fetchInsightCronStatus());
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const denied = await requireAdminOrJsonError();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as { item_id?: string };
  const result = await runInsightGeneration(body.item_id ?? null);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
