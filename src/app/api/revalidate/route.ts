import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

/**
 * Cache invalidation API.
 *
 * Auth: X-Revalidate-Secret header (NOT query string — secrets in URLs leak
 * to access logs, CDN logs, and proxy logs).
 *
 * Env: REVALIDATE_SECRET. No fallback — missing env returns 503.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // .trim() defends against the Vercel CLI newline bug (see feedback_env_var_trim.md)
  const expected = process.env.REVALIDATE_SECRET?.trim();
  if (!expected) {
    return NextResponse.json({ error: "REVALIDATE_SECRET not configured" }, { status: 503 });
  }

  const provided = request.headers.get("x-revalidate-secret")?.trim();
  if (provided !== expected) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const tag = request.nextUrl.searchParams.get("tag");
  if (!tag) {
    return NextResponse.json({ error: "Missing tag param" }, { status: 400 });
  }

  revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ revalidated: true, tag, now: Date.now() });
}
