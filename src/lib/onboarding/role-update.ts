import "server-only";

import type { createAdminClient } from "@/lib/supabase/server";
import type { Role } from "./constants";

type AdminClient = ReturnType<typeof createAdminClient>;

export type RoleUpdateResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * profiles.role 변경 — update + select 검증으로 silent fail 방지.
 *
 * RLS 트리거(prevent_role_self_change) 가 일반 사용자 직접 변경을 차단하지만
 * service_role 은 통과. update 성공처럼 보여도 트리거가 NO-OP 시킬 수 있으므로
 * select 로 실제 반영 확인.
 *
 * 사용처: /api/profiles/promote-to-artist, /api/profiles/set-initial-role.
 */
export async function safeUpdateRole(
  admin: AdminClient,
  userId: string,
  role: Role,
): Promise<RoleUpdateResult> {
  const { data, error } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", userId)
    .select("role")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (data?.role !== role) return { ok: false, error: "역할 변경에 실패했습니다" };
  return { ok: true };
}
