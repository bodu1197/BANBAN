import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { createAdminClient } from "@/lib/supabase/server";
import { ACTION_REQUIRED_OR_FILTER } from "@/lib/supabase/artist-approval-queries";

interface CountResult {
  count: number | null;
}

async function getInquiryCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("inquiries")
    .select("id", { count: "exact", head: true })
    .eq("status", "OPEN") as CountResult;
  return count ?? 0;
}

async function getExhibitionPendingCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("exhibition_entries")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending") as CountResult;
  return count ?? 0;
}

async function getNewMemberCount(): Promise<number> {
  const supabase = createAdminClient();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gte("created_at", oneDayAgo) as CountResult;
  return count ?? 0;
}

// 사후 점검 '조치 필요' 배지 카운트 — 미점검 공개 + 레거시 승인 대기 + 재검토 요청.
// 조건은 ACTION_REQUIRED_OR_FILTER(artist-approval-queries) 단일 소스 재사용(큐 정렬과 의미 동기화).
// 일반 숨김됨(요청 없음)/반려됨은 조치 완료분이라 제외(목록엔 복구/추적용 노출 — 의도된 차이).
async function getPendingArtistCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("artists")
    .select("id", { count: "exact", head: true })
    .or(ACTION_REQUIRED_OR_FILTER)
    .is("deleted_at", null) as CountResult;
  return count ?? 0;
}

async function getDormantArtistCount(): Promise<number> {
  const supabase = createAdminClient();
  // 휴면은 status='dormant'(artists 에 is_dormant 컬럼 없음 — 기존 버그로 항상 0이던 것 수정).
  const { count } = await supabase
    .from("artists")
    .select("id", { count: "exact", head: true })
    .eq("status", "dormant")
    .is("deleted_at", null) as CountResult;
  return count ?? 0;
}

async function getConversationCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("chat_rooms")
    .select("id", { count: "exact", head: true }) as CountResult;
  return count ?? 0;
}

async function getPendingReportCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "PENDING") as CountResult;
  return count ?? 0;
}

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const [pendingShops, inquiries, exhibitions, members, dormant, chats, reports] = await Promise.all([
    getPendingArtistCount(),
    getInquiryCount(),
    getExhibitionPendingCount(),
    getNewMemberCount(),
    getDormantArtistCount(),
    getConversationCount(),
    getPendingReportCount(),
  ]);

  return NextResponse.json({
    counts: {
      "/admin/artist-approvals": pendingShops,
      "/admin/inquiries": inquiries,
      "/admin/exhibitions": exhibitions,
      "/admin/members": members,
      "/admin/dormant-artists": dormant,
      "/admin/chats": chats,
      "/admin/reports": reports,
    },
  });
}
