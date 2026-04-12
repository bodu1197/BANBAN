import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const ALLOWED_FIELDS = new Set(["username", "nickname", "email"]);

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);
  const { success } = rateLimit({ key: `check-dup:${ip}`, limit: 30, windowMs: 60_000 });
  if (!success) return rateLimitResponse() as NextResponse;

  const field = request.nextUrl.searchParams.get("field");
  const value = request.nextUrl.searchParams.get("value")?.trim();

  if (!field || !value || !ALLOWED_FIELDS.has(field)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq(field, field === "email" ? value.toLowerCase() : value)
    .is("deleted_at", null)
    .limit(1)
    .single();

  return NextResponse.json({ available: !data });
}
