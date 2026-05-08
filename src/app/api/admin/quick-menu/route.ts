import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-guard";

const COLUMNS = "id, order_index, label, icon_path, link_url, is_active, updated_at";
const TABLE = "quick_menu_items";

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from(TABLE)
    .select(COLUMNS)
    .order("order_index", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as {
    label?: string;
    icon_path?: string;
    link_url?: string;
    order_index?: number;
  };

  if (!body.label || !body.icon_path) {
    return NextResponse.json({ error: "label and icon_path are required" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from(TABLE)
    .insert({
      label: body.label,
      icon_path: body.icon_path,
      link_url: body.link_url ?? "/",
      order_index: body.order_index ?? 99,
      is_active: true,
    })
    .select(COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as {
    id?: string;
    label?: string;
    icon_path?: string;
    link_url?: string;
    order_index?: number;
    is_active?: boolean;
    reorder?: Array<{ id: string; order_index: number }>;
  };

  if (body.reorder) {
    for (const item of body.reorder) {
      await auth.supabase.from(TABLE).update({ order_index: item.order_index }).eq("id", item.id);
    }
    const { data } = await auth.supabase.from(TABLE).select(COLUMNS).order("order_index", { ascending: true });
    return NextResponse.json({ items: data ?? [] });
  }

  if (typeof body.id !== "string" || !body.id.trim()) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.label !== undefined) updates.label = body.label;
  if (body.icon_path !== undefined) updates.icon_path = body.icon_path;
  if (body.link_url !== undefined) updates.link_url = body.link_url.startsWith("/") ? body.link_url : `/${body.link_url}`;
  if (body.order_index !== undefined) updates.order_index = body.order_index;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  const { data, error } = await auth.supabase
    .from(TABLE)
    .update(updates)
    .eq("id", body.id)
    .select(COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as { id?: string };
  if (typeof body.id !== "string" || !body.id.trim()) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await auth.supabase.from(TABLE).delete().eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
