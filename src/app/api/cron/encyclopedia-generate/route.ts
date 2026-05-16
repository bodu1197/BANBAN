import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runEncyclopediaGeneration } from "@/lib/encyclopedia/runner";

export const runtime = "nodejs";
export const maxDuration = 300; // up to 5 min for OpenAI generation

/**
 * Daily encyclopedia generator. Triggered by Vercel Cron.
 *
 * Auth header: `Authorization: Bearer <CRON_SECRET>` (Vercel Cron auto-attaches).
 * Optional override: ?topic_id=N to regenerate a specific topic.
 */

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function authError(request: NextRequest): NextResponse | null {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const auth = request.headers.get("authorization")?.trim() ?? "";
  if (!safeEqual(auth, `Bearer ${expected}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = authError(request);
  if (denied) return denied;

  const raw = request.nextUrl.searchParams.get("topic_id");
  const overrideId = raw ? Number(raw) : null;
  const result = await runEncyclopediaGeneration(
    overrideId !== null && Number.isFinite(overrideId) ? overrideId : null,
  );

  if ("done" in result) {
    return NextResponse.json(result, { status: 200 });
  }
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
}
