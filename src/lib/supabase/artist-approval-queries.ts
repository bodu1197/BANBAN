import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "./server";
import { escapeIlike } from "./queries";

export const APPROVALS_PAGE_SIZE = 20;

/**
 * 사후 점검 큐 상태(사전승인 폐지 후):
 * - published : 자동 공개됨(active) + 아직 관리자 점검 전(reviewed_by NULL) → '점검 필요' (확인/숨김)
 * - active    : 공개중(active) + 점검 완료(reviewed_by 있음) → '공개중' (언제든 사유 입력 후 숨김 가능)
 * - hidden    : 관리자가 테이크다운(is_hide=true) → '복구' 가능
 * - pending   : (레거시) 사전승인 시절 승인 대기 — 승인/반려 가능
 * - rejected  : (레거시) 반려됨 — 추적용
 */
export type ApprovalStatus = "published" | "active" | "hidden" | "pending" | "rejected";

export interface ArtistApprovalItem {
  id: string;
  userId: string;
  title: string;
  nickname: string;
  contact: string;
  address: string;
  introduce: string;
  profileImagePath: string | null;
  createdAt: string;
  approvedAt: string | null;
  status: ApprovalStatus; // 줄 단위 파생 상태 — 뱃지/액션 분기
  isResubmit: boolean;
  prevRejectReason: string | null;
  rejectedAt: string | null; // 반려 시각 (rejected 일 때만, 그 외 null)
}

export interface ArtistApprovalsResult {
  artists: ArtistApprovalItem[];
  total: number;
  page: number;
  limit: number;
}

interface ArtistApprovalRow {
  id: string; user_id: string; title: string; contact: string; address: string;
  introduce: string; profile_image_path: string | null; created_at: string; status: string;
  resubmitted_at: string | null; reject_reason: string | null; rejected_at: string | null;
  is_hide: boolean; reviewed_by: string | null; approved_at: string | null;
}

/** 줄 단위 파생 상태 — 숨김이 최우선, 그다음 레거시 상태, 공개 active 는 점검 여부로 published/active 구분. */
function deriveStatus(row: ArtistApprovalRow): ApprovalStatus {
  if (row.is_hide) return "hidden";
  if (row.status === "rejected") return "rejected";
  if (row.status === "pending") return "pending";
  // 여기 도달 = 공개중(active, is_hide=false). 아직 점검 안 했으면 '점검 필요', 점검했으면 '공개중'.
  return row.reviewed_by === null ? "published" : "active";
}

async function fetchNicknameMap(supabase: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const { data } = await supabase.from("profiles").select("id, nickname").in("id", ids);
  for (const p of (data ?? []) as { id: string; nickname: string | null }[]) {
    map.set(p.id, p.nickname ?? "알 수 없음");
  }
  return map;
}

// 점검 큐 필터: 공개중(active+노출중) 전부(점검 여부 무관 — 언제든 숨김 가능해야 함) 또는 숨김됨 또는 레거시(pending/rejected).
const QUEUE_OR_FILTER = "and(status.eq.active,is_hide.eq.false),is_hide.eq.true,status.eq.pending,status.eq.rejected";

// '조치 필요'(관리자 액션 대기) 필터 — 사이드바 카운트 배지와 의미를 맞추는 단일 소스(중복 정의 방지).
// 미점검 공개(active+reviewed_by NULL) + 레거시 승인 대기(pending) + 재검토 요청(숨김+resubmitted_at).
// 목록(QUEUE_OR_FILTER)은 이보다 넓게 '관리 가능한 모든 샵'을 보여주되, 여기 잡히는 항목은 정렬상 상단에 온다.
export const ACTION_REQUIRED_OR_FILTER =
  "and(status.eq.active,reviewed_by.is.null,is_hide.eq.false),status.eq.pending,and(is_hide.eq.true,resubmitted_at.not.is.null)";

/**
 * 사후 점검 큐 단일 목록(점검 필요 + 숨김됨 + 레거시 pending/rejected) — 각 항목의 status 로 상태 표시.
 * 서버 컴포넌트(초기 로딩)와 API 라우트(검색/페이지네이션) 공용.
 * createAdminClient(service_role) 사용 — 호출부(AdminLayout/requireAdmin)에서 관리자 검증 선행.
 */
export async function fetchArtistApprovals(
  opts: { page: number; search: string },
): Promise<ArtistApprovalsResult> {
  const supabase = createAdminClient();
  const page = Math.max(1, opts.page);
  const offset = (page - 1) * APPROVALS_PAGE_SIZE;

  let query = supabase
    .from("artists")
    .select(
      "id, user_id, title, contact, address, introduce, profile_image_path, created_at, status, resubmitted_at, reject_reason, rejected_at, is_hide, reviewed_by, approved_at",
      { count: "exact" },
    )
    .is("deleted_at", null)
    .or(QUEUE_OR_FILTER);

  if (opts.search) query = query.ilike("title", `%${escapeIlike(opts.search)}%`);

  // 정렬 우선순위: ① 재검토 요청(resubmitted_at 있음 — 운영자가 수정 후 대기, 가장 시급)을 최상단으로,
  // ② 공개중(is_hide=false) 관리 대상, ③ 일반 숨김됨은 뒤로. 각 그룹 내 최근순.
  // resubmitted_at NOT NULL 을 먼저(내림차순·nulls last) → 재검토 요청이 1페이지 맨 위에 뜬다.
  query = query
    .order("resubmitted_at", { ascending: false, nullsFirst: false })
    .order("is_hide", { ascending: true })
    .order("created_at", { ascending: false })
    .range(offset, offset + APPROVALS_PAGE_SIZE - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  const artists = (data ?? []) as ArtistApprovalRow[];
  const nicknameMap = await fetchNicknameMap(supabase, artists.map((a) => a.user_id));

  const items: ArtistApprovalItem[] = artists.map((a) => ({
    id: a.id, userId: a.user_id, title: a.title, nickname: nicknameMap.get(a.user_id) ?? "알 수 없음",
    contact: a.contact, address: a.address, introduce: a.introduce,
    profileImagePath: a.profile_image_path, createdAt: a.created_at, approvedAt: a.approved_at,
    status: deriveStatus(a),
    isResubmit: a.resubmitted_at !== null, prevRejectReason: a.reject_reason,
    rejectedAt: a.rejected_at,
  }));

  return { artists: items, total: count ?? 0, page, limit: APPROVALS_PAGE_SIZE };
}
