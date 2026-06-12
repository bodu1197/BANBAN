import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "./server";
import { escapeIlike } from "./queries";

export const APPROVALS_PAGE_SIZE = 20;

/** 승인 워크플로 탭. pending=승인 대기, rejected=반려됨(보기 전용 추적). */
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
  isResubmit: boolean;
  prevRejectReason: string | null;
  rejectedAt: string | null; // 반려됨 탭: 반려 시각 (pending 탭에선 null)
}

export interface ArtistApprovalsResult {
  artists: ArtistApprovalItem[];
  total: number;
  page: number;
  limit: number;
}

interface PendingRow {
  id: string; user_id: string; title: string; contact: string; address: string;
  introduce: string; profile_image_path: string | null; created_at: string;
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
 * 승인 워크플로 샵 목록 — 서버 컴포넌트(초기 로딩)와 API 라우트(검색/페이지네이션/탭 전환) 공용.
 * status=pending(승인 대기) | rejected(반려됨, 보기 전용 추적).
 * createAdminClient(service_role) 사용 — 호출부(AdminLayout/requireAdmin)에서 관리자 검증 선행.
 */
export async function fetchArtistApprovals(
  opts: { page: number; search: string; status?: ApprovalStatus },
): Promise<ArtistApprovalsResult> {
  const supabase = createAdminClient();
  const status: ApprovalStatus = opts.status === "rejected" ? "rejected" : "pending";
  const page = Math.max(1, opts.page);
  const offset = (page - 1) * APPROVALS_PAGE_SIZE;

  let query = supabase
    .from("artists")
    .select(
      "id, user_id, title, contact, address, introduce, profile_image_path, created_at, resubmitted_at, reject_reason, rejected_at",
      { count: "exact" },
    )
    .eq("status", status)
    .is("deleted_at", null);

  if (opts.search) query = query.ilike("title", `%${escapeIlike(opts.search)}%`);

  // pending: 오래 기다린 순(FIFO) 먼저 검토. rejected: 최근 반려순(진행 추적).
  query = status === "rejected"
    ? query.order("rejected_at", { ascending: false })
    : query.order("created_at", { ascending: true });

  query = query.range(offset, offset + APPROVALS_PAGE_SIZE - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  const artists = (data ?? []) as PendingRow[];
  const nicknameMap = await fetchNicknameMap(supabase, artists.map((a) => a.user_id));

  const items: ArtistApprovalItem[] = artists.map((a) => ({
    id: a.id, userId: a.user_id, title: a.title, nickname: nicknameMap.get(a.user_id) ?? "알 수 없음",
    contact: a.contact, address: a.address, introduce: a.introduce,
    profileImagePath: a.profile_image_path, createdAt: a.created_at,
    isResubmit: a.resubmitted_at !== null, prevRejectReason: a.reject_reason,
    rejectedAt: a.rejected_at,
  }));

  return { artists: items, total: count ?? 0, page, limit: APPROVALS_PAGE_SIZE };
}
