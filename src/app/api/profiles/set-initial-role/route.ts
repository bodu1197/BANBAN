import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ALLOWED_ROLES, isWithinOnboardingWindow, type Role } from "@/lib/onboarding/constants";
import { safeUpdateRole } from "@/lib/onboarding/role-update";

const ROLE_SET = new Set<string>(ALLOWED_ROLES);

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

async function parseRole(request: NextRequest): Promise<Role | null> {
  try {
    const body = await request.json();
    const role = String(body.role ?? "").trim();
    return ROLE_SET.has(role) ? (role as Role) : null;
  } catch {
    return null;
  }
}

/**
 * SNS 신규 가입자의 회원 유형 최초 설정.
 * 호출 위치: /onboarding 페이지에서 사용자가 카드 선택 시.
 * 가입 후 5분 윈도우 내에서만 허용 → 그 외 시점에는 RLS 트리거가 차단.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError("Unauthorized", 401);

  const role = await parseRole(request);
  if (!role) return jsonError("유효하지 않은 요청입니다", 400);

  const { data: profile } = await supabase
    .from("profiles").select("role, created_at").eq("id", user.id).maybeSingle();
  if (!profile) return jsonError("프로필을 찾을 수 없습니다", 404);

  // 이미 다른 role 이면 변경 없음 (idempotent)
  if (profile.role !== "user") {
    return NextResponse.json({ success: true, role: profile.role });
  }

  if (!isWithinOnboardingWindow(profile.created_at)) {
    return jsonError("온보딩 시간이 만료되었습니다", 403);
  }

  // role="user" 는 default 라 update 불필요
  if (role === "user") return NextResponse.json({ success: true, role: "user" });

  const result = await safeUpdateRole(createAdminClient(), user.id, role);
  if (!result.ok) return jsonError(result.error, 500);
  return NextResponse.json({ success: true, role });
}
