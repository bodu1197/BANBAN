import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { notifyUser } from "@/lib/supabase/notification-queries";

// ─── Types ───────────────────────────────────────────────

interface PatchBody {
  id: string;
  status?: "approved" | "rejected";
  admin_note?: string;
}

interface DeleteBody {
  id: string;
}

const ENTRY_COLUMNS = "id, exhibition_id, portfolio_id, artist_id, status, admin_note, created_at, updated_at, portfolios:portfolio_id(title, description, price_origin, price, discount_rate, portfolio_media(storage_path, order_index)), artists:artist_id(title, user_id, profile_image_path), exhibitions:exhibition_id(title)";

// ─── GET ─────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const exhibitionId = url.searchParams.get("exhibition_id");

  if (!exhibitionId) {
    return NextResponse.json({ error: "exhibition_id is required" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("exhibition_entries")
    .select(ENTRY_COLUMNS)
    .eq("exhibition_id", exhibitionId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ entries: data ?? [] });
}

// ─── Notification helper ─────────────────────────────────

interface EntryWithJoins {
  artists: { user_id: string } | null;
  exhibitions: { title: string } | null;
}

async function notifyEntryStatusChange(
  entry: unknown, status: "approved" | "rejected", adminNote?: string,
): Promise<void> {
  const e = entry as EntryWithJoins;
  const userId = e.artists?.user_id;
  if (!userId) return;

  const exTitle = e.exhibitions?.title ?? "기획전";
  const isApproved = status === "approved";
  const title = isApproved ? "기획전 출품 승인" : "기획전 출품 반려";
  const note = !isApproved && adminNote ? `\n사유: ${adminNote}` : "";
  const body = isApproved
    ? `[${exTitle}] 출품이 승인되었습니다.`
    : `[${exTitle}] 출품이 반려되었습니다.${note}`;

  await notifyUser(userId, { type: "exhibition_entry", title, body });
}

// ─── PATCH (approve/reject) ──────────────────────────────

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json() as PatchBody;
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (body.status) updates.status = body.status;
  if (body.admin_note !== undefined) updates.admin_note = body.admin_note;
  updates.updated_at = new Date().toISOString();

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("exhibition_entries")
    .update(updates)
    .eq("id", body.id)
    .select(ENTRY_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.status && data) {
    void notifyEntryStatusChange(data, body.status, body.admin_note);
  }

  return NextResponse.json({ entry: data });
}

// ─── DELETE ──────────────────────────────────────────────

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json() as DeleteBody;
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await auth.supabase
    .from("exhibition_entries")
    .delete()
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
