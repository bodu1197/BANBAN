import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Server Component / Server Action 용 — 현재 로그인 사용자가 admin 인지 boolean 반환.
 *  API route 의 `requireAdmin` (NextResponse 반환) 과 다른 사용처. 인증 안 됨/비admin 모두 false. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return Boolean((data as { is_admin: boolean } | null)?.is_admin);
}
