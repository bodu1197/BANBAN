import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Increment view count for an encyclopedia article.
 * Called once per session from a tiny client component.
 * No auth — abuse is mitigated by session-level dedupe on the client.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { slug } = (await request.json().catch(() => ({}))) as { slug?: string };
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types
  const { error } = await (supabase as any).rpc("increment_encyclopedia_view", {
    p_slug: slug,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
