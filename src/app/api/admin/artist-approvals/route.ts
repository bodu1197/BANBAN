import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { fetchPendingArtists } from "@/lib/supabase/artist-approval-queries";
import { notifyUser } from "@/lib/supabase/notification-queries";
import { notifySearchEngines } from "@/lib/utils/search-notify";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const search = (searchParams.get("search") ?? "").trim();

  try {
    const result = await fetchPendingArtists({ page, search });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "목록 조회 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function approveArtist(
  supabase: SupabaseClient, adminId: string, id: string,
): Promise<NextResponse> {
  const { data: updated, error } = await supabase
    .from("artists")
    .update({
      status: "active",
      approved_at: new Date().toISOString(),
      reviewed_by: adminId,
      reject_reason: null,
      rejected_at: null,
    })
    .eq("id", id)
    .eq("status", "pending") // pending 0행이면 동시변경/이미처리 → 409
    .select("id, user_id, title");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated?.length) return NextResponse.json({ error: "not_pending_or_already_changed" }, { status: 409 });

  const a = updated[0] as { id: string; user_id: string; title: string };
  // 인앱 알림(+Swing2App 푸시). notifyUser 내부에서 fire-and-forget.
  await notifyUser(a.user_id, {
    type: "SHOP_APPROVED",
    title: "샵 승인 완료 🎉",
    body: `'${a.title}' 샵이 승인되어 정식 오픈되었습니다. 이제 검색·추천에 노출됩니다.`,
    data: { artistId: a.id },
  });
  // 승인 시점에만 즉시 색인 요청(등록 시점은 pending=비공개라 soft-404 위험).
  notifySearchEngines([`/artists/${a.id}`]);
  revalidatePath("/");
  revalidatePath(`/artists/${a.id}`);

  return NextResponse.json({ success: true });
}

async function rejectArtist(
  supabase: SupabaseClient, adminId: string, id: string, reason: string,
): Promise<NextResponse> {
  const { data: updated, error } = await supabase
    .from("artists")
    .update({
      status: "rejected",
      reject_reason: reason,
      rejected_at: new Date().toISOString(),
      reviewed_by: adminId,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id, user_id, title");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated?.length) return NextResponse.json({ error: "not_pending_or_already_changed" }, { status: 409 });

  const a = updated[0] as { id: string; user_id: string; title: string };
  await notifyUser(a.user_id, {
    type: "SHOP_REJECTED",
    title: "샵 등록 반려 안내",
    body: `'${a.title}' 샵 등록이 반려되었습니다. 사유: ${reason} — 마이페이지에서 수정 후 다시 신청할 수 있습니다.`,
    data: { artistId: a.id, reason },
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json() as { id?: string; action?: string; reason?: string };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (body.action === "approve") {
    return approveArtist(auth.supabase, auth.userId, body.id);
  }
  if (body.action === "reject") {
    const reason = (body.reason ?? "").trim();
    if (!reason) return NextResponse.json({ error: "반려 사유를 입력해주세요" }, { status: 400 });
    if (reason.length > 500) return NextResponse.json({ error: "반려 사유는 500자 이하" }, { status: 400 });
    return rejectArtist(auth.supabase, auth.userId, body.id, reason);
  }
  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}
