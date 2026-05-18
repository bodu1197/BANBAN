// @client-reason: ISR 캐시된 HTML 에 admin 상태가 박히지 않도록 — mount 후 클라이언트 측에서 profiles.is_admin 조회.
"use client";

import { useEffect, useState } from "react";

/** 클라이언트에서 현재 사용자의 admin 여부 확인.
 *  ISR 페이지 (revalidate > 0) 의 server-side fetch 와 달리, 캐시된 HTML 에 admin 상태가
 *  포함되지 않아 비-admin 사용자에게 admin UI 가 노출되는 위험 차단.
 *  로그아웃/미로그인은 false. */
export function useIsCurrentUserAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const checkAdmin = async (): Promise<void> => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
      if (!cancelled) {
        setIsAdmin(Boolean((data as { is_admin: boolean } | null)?.is_admin));
      }
    };
    void checkAdmin();
    return () => { cancelled = true; };
  }, []);

  return isAdmin;
}
