import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchEncyclopediaCronStatus } from "@/lib/encyclopedia/admin-queries";
import { runEncyclopediaGeneration } from "@/lib/encyclopedia/runner";

export const runtime = "nodejs";
export const maxDuration = 300;

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();
  return !!(data as { is_admin: boolean } | null)?.is_admin;
}

async function guard(): Promise<NextResponse | null> {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}

/** GET /api/admin/encyclopedia — dashboard status */
export async function GET(): Promise<NextResponse> {
  const denied = await guard();
  if (denied) return denied;

  const status = await fetchEncyclopediaCronStatus();
  return NextResponse.json(status);
}

/** POST /api/admin/encyclopedia — manual generate
 *  Body: { topic_id?: number }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const denied = await guard();
  if (denied) return denied;

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
