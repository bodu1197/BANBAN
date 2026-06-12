import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "./server";
import { escapeIlike } from "./queries";

export const APPROVALS_PAGE_SIZE = 20;

/** 승인 워크플로 상태. pending=승인 대기, rejected=반려됨. 단일 목록에서 각 줄의 상태 표시에 사용. */
export type ApprovalStatus = "pending" | "rejected";

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
  status: ApprovalStatus; // 줄 단위 현재 상태 — 뱃지/액션 분기
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

/**
 * 승인 워크플로 샵 단일 목록(승인 대기 + 반려됨) — 각 항목의 status 로 상태 표시.
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
      "id, user_id, title, contact, address, introduce, profile_image_path, created_at, status, resubmitted_at, reject_reason, rejected_at",
      { count: "exact" },
    )
    .in("status", ["pending", "rejected"])
    .is("deleted_at", null);

  if (opts.search) query = query.ilike("title", `%${escapeIlike(opts.search)}%`);

  // 승인 대기(pending)를 먼저, 그다음 반려됨(rejected) — 'pending' < 'rejected'. 각 그룹 내 오래된 신청순(FIFO).
  // supabase-js 는 .order() 체인을 '누적'한다 → (status, created_at) 다중 정렬키.
  // (exhibitions/hero-banners route 와 동일한 검증된 패턴. 뒤 .order() 가 앞을 덮어쓰지 않음.)
  query = query
    .order("status", { ascending: true })
    .order("created_at", { ascending: true })
    .range(offset, offset + APPROVALS_PAGE_SIZE - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  const artists = (data ?? []) as ArtistApprovalRow[];
  const nicknameMap = await fetchNicknameMap(supabase, artists.map((a) => a.user_id));

  const items: ArtistApprovalItem[] = artists.map((a) => ({
    id: a.id, userId: a.user_id, title: a.title, nickname: nicknameMap.get(a.user_id) ?? "알 수 없음",
    contact: a.contact, address: a.address, introduce: a.introduce,
    profileImagePath: a.profile_image_path, createdAt: a.created_at,
    status: a.status === "rejected" ? "rejected" : "pending",
    isResubmit: a.resubmitted_at !== null, prevRejectReason: a.reject_reason,
    rejectedAt: a.rejected_at,
  }));

  return { artists: items, total: count ?? 0, page, limit: APPROVALS_PAGE_SIZE };
}
