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

const REORDER_TEMP_OFFSET = 1_000_000;

async function handleReorder(
  supabase: AdminClient["supabase"],
  reorder: Array<{ id: string; order_index: number }>,
): Promise<NextResponse> {
  // 2-phase update: order_index 에 UNIQUE 제약이 있으면 1→2, 2→1 같은 swap 이
  // 동시 UPDATE 시 충돌한다. Phase 1 에서 모든 row 의 order_index 를 음수 임시값으로
  // 옮긴 후 Phase 2 에서 최종 값으로 설정해 충돌을 회피한다.
  const phase1 = await Promise.all(
    reorder.map((item, idx) =>
      supabase
        .from(TABLE)
        .update({ order_index: -(REORDER_TEMP_OFFSET + idx) })
        .eq("id", item.id),
    ),
  );
  const phase1Failure = phase1.find((r) => r.error);
  if (phase1Failure?.error) {
    const { data } = await supabase.from(TABLE).select(COLUMNS).order("order_index", { ascending: true });
    return NextResponse.json(
      { error: `reorder phase1 실패: ${phase1Failure.error.message}`, items: data ?? [] },
      { status: 500 },
    );
  }

  const phase2 = await Promise.all(
    reorder.map((item) =>
      supabase.from(TABLE).update({ order_index: item.order_index }).eq("id", item.id),
    ),
  );
  const phase2Failure = phase2.find((r) => r.error);
  const { data } = await supabase.from(TABLE).select(COLUMNS).order("order_index", { ascending: true });

  if (phase2Failure?.error) {
    return NextResponse.json(
      { error: `reorder phase2 실패: ${phase2Failure.error.message}`, items: data ?? [] },
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
