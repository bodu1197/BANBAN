import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-guard";

const COLUMNS = "id, slot, image_path, link_url, alt_text, is_active, updated_at";

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from("home_banners" as "banners")
    .select(COLUMNS)
    .order("slot", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ banners: data ?? [] });
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
  if (body.image_path !== undefined) updates.image_path = body.image_path;
  if (body.link_url !== undefined) updates.link_url = body.link_url;
  if (body.alt_text !== undefined) updates.alt_text = body.alt_text;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  const { data, error } = await auth.supabase
    .from("home_banners" as "banners")
    .update(updates)
    .eq("id", body.id)
    .select(COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ banner: data });
}
