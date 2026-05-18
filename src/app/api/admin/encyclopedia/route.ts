import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { fetchEncyclopediaCronStatus } from "@/lib/encyclopedia/admin-queries";
import { runEncyclopediaGeneration } from "@/lib/encyclopedia/runner";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const status = await fetchEncyclopediaCronStatus();
  return NextResponse.json(status);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as { topic_id?: number };
  const overrideId =
    typeof body.topic_id === "number" && Number.isFinite(body.topic_id)
      ? body.topic_id
      : null;

  const result = await runEncyclopediaGeneration(overrideId);
  if ("done" in result) return NextResponse.json(result);
  if (!result.ok) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
