import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { sanitizeLinkUrl, sanitizeStoragePath } from "@/lib/url-utils";

const COLUMNS = "id, slot, image_path, link_url, alt_text, is_active, updated_at";
const MAX_ALT_LENGTH = 500;

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from("home_banners")
    .select(COLUMNS)
    .order("slot", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { banners: data ?? [] },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as {
    id: string;
    image_path?: string;
    link_url?: string;
    alt_text?: string;
    is_active?: boolean;
  };

  if (typeof body.id !== "string" || !body.id.trim()) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.image_path !== undefined) {
    const safePath = sanitizeStoragePath(body.image_path);
    if (!safePath) {
      return NextResponse.json({ error: "invalid image_path" }, { status: 400 });
    }
    updates.image_path = safePath;
  }
  if (body.link_url !== undefined) updates.link_url = sanitizeLinkUrl(body.link_url);
  if (body.alt_text !== undefined) {
    const altText = body.alt_text.trim().slice(0, MAX_ALT_LENGTH);
    updates.alt_text = altText;
  }
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  const { data, error } = await auth.supabase
    .from("home_banners")
    .update(updates)
    .eq("id", body.id)
    .select(COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ banner: data });
}
