import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { fetchArtistApprovals } from "@/lib/supabase/artist-approval-queries";
import { notifyUser } from "@/lib/supabase/notification-queries";
import { notifySearchEngines } from "@/lib/utils/search-notify";

// 알림 발송에 필요한 소유자/제목 컬럼 — 상태 변경 후 select 에 공통 사용.
const OWNER_SELECT = "id, user_id, title";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const search = (searchParams.get("search") ?? "").trim();

  try {
    const result = await fetchArtistApprovals({ page, search });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "목록 조회 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── 사후 점검 액션 (자동공개 전환 후) ──────────────────────────

/** 점검 완료(이상 없음) — reviewed_by 만 채워 큐에서 내린다. 공개 상태 유지. */
async function confirmArtist(
  supabase: SupabaseClient, adminId: string, id: string,
): Promise<NextResponse> {
  const { data: updated, error } = await supabase
    .from("artists")
    .update({ reviewed_by: adminId })
    .eq("id", id)
    .eq("status", "active")
    .is("reviewed_by", null)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated?.length) return NextResponse.json({ error: "not_unreviewed_or_already_changed" }, { status: 409 });
  return NextResponse.json({ success: true });
}

/** 테이크다운 — is_hide=true 로 즉시 비공개 + 사유 기록(reject_reason). 본인 알림(사유 포함) + 색인 소거. */
async function takedownArtist(
  supabase: SupabaseClient, adminId: string, id: string, rawReason: string,
): Promise<NextResponse> {
  const reason = rawReason.trim();
  if (!reason) return NextResponse.json({ error: "비공개 사유를 입력해주세요" }, { status: 400 });
  if (reason.length > 500) return NextResponse.json({ error: "사유는 500자 이하" }, { status: 400 });

  const { data: updated, error } = await supabase
    .from("artists")
    .update({ is_hide: true, reviewed_by: adminId, reject_reason: reason, resubmitted_at: null })
    .eq("id", id)
    .eq("is_hide", false)
    .select(OWNER_SELECT);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated?.length) return NextResponse.json({ error: "already_hidden_or_not_found" }, { status: 409 });

  const a = updated[0] as { id: string; user_id: string; title: string };
  await notifyUser(a.user_id, {
    type: "SHOP_HIDDEN",
    title: "샵 비공개 처리 안내",
    body: `'${a.title}' 샵이 관리자 점검으로 비공개 처리되었습니다. 사유: ${reason} — 마이페이지에서 수정 후 '재검토 요청'을 눌러주세요.`,
    data: { artistId: a.id, reason },
  });
  notifySearchEngines([`/artists/${a.id}`], "URL_DELETED"); // 비공개 → 색인 소거 신호.
  revalidatePath("/");
  revalidatePath(`/artists/${a.id}`);
  return NextResponse.json({ success: true });
}

/**
 * 복구 — is_hide=false 로 다시 공개 + 사유/재검토요청 흔적 클리어. 본인 알림 + 재색인 + 캐시 무효화.
 * adminId 불필요(reviewed_by 는 테이크다운 때 이미 기록됨 — 복구는 상태 토글만).
 */
async function restoreArtist(
  supabase: SupabaseClient, id: string,
): Promise<NextResponse> {
  const { data: updated, error } = await supabase
    .from("artists")
    .update({ is_hide: false, reject_reason: null, resubmitted_at: null })
    .eq("id", id)
    .eq("is_hide", true)
    .select(OWNER_SELECT);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated?.length) return NextResponse.json({ error: "not_hidden_or_not_found" }, { status: 409 });

  const a = updated[0] as { id: string; user_id: string; title: string };
  await notifyUser(a.user_id, {
    type: "SHOP_APPROVED",
    title: "샵 공개 복구 안내",
    body: `'${a.title}' 샵이 다시 공개되었습니다. 검색·추천에 노출됩니다.`,
    data: { artistId: a.id },
  });
  notifySearchEngines([`/artists/${a.id}`]);
  revalidatePath("/");
  revalidatePath(`/artists/${a.id}`);
  return NextResponse.json({ success: true });
}

// ── 레거시 승인/반려 (사전승인 시절 pending 샵 잔여분 처리용) ──

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
    .eq("status", "pending")
    .select(OWNER_SELECT);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated?.length) return NextResponse.json({ error: "not_pending_or_already_changed" }, { status: 409 });

  const a = updated[0] as { id: string; user_id: string; title: string };
  await notifyUser(a.user_id, {
    type: "SHOP_APPROVED",
    title: "샵 승인 완료 🎉",
    body: `'${a.title}' 샵이 승인되어 정식 오픈되었습니다. 이제 검색·추천에 노출됩니다.`,
    data: { artistId: a.id },
  });
  notifySearchEngines([`/artists/${a.id}`]);
  revalidatePath("/");
  revalidatePath(`/artists/${a.id}`);

  return NextResponse.json({ success: true });
}

async function rejectArtist(
  supabase: SupabaseClient, adminId: string, id: string, rawReason: string,
): Promise<NextResponse> {
  const reason = rawReason.trim();
  if (!reason) return NextResponse.json({ error: "반려 사유를 입력해주세요" }, { status: 400 });
  if (reason.length > 500) return NextResponse.json({ error: "반려 사유는 500자 이하" }, { status: 400 });

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
    .select(OWNER_SELECT);

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

  if (body.action === "confirm") return confirmArtist(auth.supabase, auth.userId, body.id);
  if (body.action === "takedown") return takedownArtist(auth.supabase, auth.userId, body.id, body.reason ?? "");
  if (body.action === "restore") return restoreArtist(auth.supabase, body.id);
  if (body.action === "approve") return approveArtist(auth.supabase, auth.userId, body.id);
  if (body.action === "reject") return rejectArtist(auth.supabase, auth.userId, body.id, body.reason ?? "");
  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}
