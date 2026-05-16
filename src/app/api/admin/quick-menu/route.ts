import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { sanitizeLinkUrl, sanitizeStoragePath } from "@/lib/url-utils";

const COLUMNS = "id, order_index, label, icon_path, link_url, is_active, updated_at";
const TABLE = "quick_menu_items";
const MAX_LABEL_LENGTH = 100;

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from(TABLE)
    .select(COLUMNS)
    .order("order_index", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(
    { items: data ?? [] },
    { headers: { "Cache-Control": "private, no-store" } },
  );
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
  const safeIconPath = sanitizeStoragePath(body.icon_path);
  if (!safeIconPath) {
    return NextResponse.json({ error: "invalid icon_path" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from(TABLE)
    .insert({
      label: body.label.trim().slice(0, MAX_LABEL_LENGTH),
      icon_path: safeIconPath,
      link_url: sanitizeLinkUrl(body.link_url),
      order_index: body.order_index ?? 99,
      is_active: true,
    })
    .select(COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

type AdminClient = Awaited<ReturnType<typeof requireAdmin>> & { ok: true };

async function handleReorder(
  supabase: AdminClient["supabase"],
  reorder: Array<{ id: string; order_index: number }>,
): Promise<NextResponse> {
  // Note: 진정한 트랜잭션은 Supabase RPC 가 필요하다. 여기서는 Promise.all 로
  // 모든 UPDATE 를 발행하고, 하나라도 실패하면 500 + 현재 server 상태를 반환한다.
  // partial update 가 발생할 수 있지만, 응답의 items 로 클라이언트가 자신의
  // optimistic state 를 server state 와 동기화할 수 있다.
  const results = await Promise.all(
    reorder.map((item) =>
      supabase.from(TABLE).update({ order_index: item.order_index }).eq("id", item.id),
    ),
  );
  const failure = results.find((r) => r.error);
  const { data } = await supabase.from(TABLE).select(COLUMNS).order("order_index", { ascending: true });

  if (failure?.error) {
    return NextResponse.json(
      { error: failure.error.message, items: data ?? [] },
      { status: 500 },
    );
  }
  return NextResponse.json({ items: data ?? [] });
}

function buildUpdatePatch(body: {
  label?: string;
  icon_path?: string;
  link_url?: string;
  order_index?: number;
  is_active?: boolean;
}): { updates: Record<string, unknown> } | { error: string } {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.label !== undefined) updates.label = body.label.trim().slice(0, MAX_LABEL_LENGTH);
  if (body.icon_path !== undefined) {
    const safePath = sanitizeStoragePath(body.icon_path);
    if (!safePath) return { error: "invalid icon_path" };
    updates.icon_path = safePath;
  }
  if (body.link_url !== undefined) updates.link_url = sanitizeLinkUrl(body.link_url);
  if (body.order_index !== undefined) updates.order_index = body.order_index;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  return { updates };
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
    return handleReorder(auth.supabase, body.reorder);
  }

  if (typeof body.id !== "string" || !body.id.trim()) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const patch = buildUpdatePatch(body);
  if ("error" in patch) {
    return NextResponse.json({ error: patch.error }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from(TABLE)
    .update(patch.updates)
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
