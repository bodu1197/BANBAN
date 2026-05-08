import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-guard";

interface BannerBody {
  id?: string;
  title?: string;
  subtitle?: string;
  image_path?: string;
  link_url?: string | null;
  order_index?: number;
  is_active?: boolean;
}

const COLUMNS = "id, title, subtitle, image_path, link_url, order_index, is_active, created_at";
const UPDATABLE_KEYS = ["title", "subtitle", "image_path", "link_url", "order_index", "is_active"] as const;

function buildUpdates(body: BannerBody): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  for (const key of UPDATABLE_KEYS) {
    // eslint-disable-next-line security/detect-object-injection -- Safe: iterating over constant key list
    const val = body[key];
    // eslint-disable-next-line security/detect-object-injection -- Safe: iterating over constant key list
    if (val !== undefined) updates[key] = val;
  }
  return updates;
}

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from("promo_banners")
    .select(COLUMNS)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ banners: data ?? [] });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json() as BannerBody;
  if (!body.image_path) {
    return NextResponse.json({ error: "image_path is required" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("promo_banners")
    .insert({
      title: body.title ?? "",
      subtitle: body.subtitle ?? null,
      image_path: body.image_path,
      link_url: body.link_url ?? null,
      order_index: body.order_index ?? 0,
      is_active: body.is_active ?? true,
    })
    .select(COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ banner: data });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json() as BannerBody;
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const updates = buildUpdates(body);
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("promo_banners")
    .update(updates)
    .eq("id", body.id)
    .select(COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ banner: data });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json() as { id: string };
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await auth.supabase
    .from("promo_banners")
    .delete()
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
