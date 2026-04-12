import { NextRequest, NextResponse } from "next/server";
import { runBlogGeneration } from "@/lib/blog/runner";
import { checkCronSecret } from "@/lib/cron-jobs/admin-guard";

export const runtime = "nodejs";
export const maxDuration = 300;

const BATCH_SIZE = 5;

/**
 * Daily blog generator. Generates up to 5 posts per cron run from portfolios
 * that don't yet have a blog_post.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = checkCronSecret(request.headers.get("authorization"));
  if (denied) return denied;

  const results = [];
  for (let i = 0; i < BATCH_SIZE; i++) {
    const r = await runBlogGeneration(null);
    results.push(r);
    if ("done" in r || !r.ok) break;
  }
  return NextResponse.json({ ok: true, batch: results });
}
