import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { safeUpdateRole } from "@/lib/onboarding/role-update";

/**
 * 일반 회원 → 시술사 역할 승격.
 * artists 테이블에 본인 행이 실제로 존재할 때만 profiles.role='artist' 로 변경.
 * 클라이언트가 직접 profiles.role 을 변경 못하도록 우회 경로 차단 (RLS 트리거와 짝).
 *
 * 호출 위치: ArtistRegisterClient 의 artists insert 성공 직후.
 */
export async function POST(): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!artist) {
    return NextResponse.json({ error: "샵 등록이 완료되어야 합니다" }, { status: 400 });
  }

  const result = await safeUpdateRole(createAdminClient(), user.id, "artist");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
