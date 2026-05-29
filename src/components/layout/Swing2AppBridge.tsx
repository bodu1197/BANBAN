// @client-reason: Swing2App JS bridge requires browser APIs (window, script injection)
"use client";

import { useEffect, useRef } from "react";
import { idle } from "@/lib/idle";

const SWING_IDLE_TIMEOUT_MS = 2000;

// Swing2App 플러그인 타입은 globals.d.ts 의 Window.swingWebViewPlugin ambient 선언 사용.
interface MinimalUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, string>;
}

function getPlugin(): NonNullable<Window["swingWebViewPlugin"]> | null {
  if (typeof window === "undefined") return null;
  return window.swingWebViewPlugin ?? null;
}

function getUserDisplayName(user: MinimalUser): string {
  const meta = user.user_metadata;
  return meta?.username ?? meta?.nickname ?? user.email ?? "user";
}

function syncLogin(user: MinimalUser): void {
  getPlugin()?.app.login.doAppLogin(user.id, getUserDisplayName(user));
}

function syncLogout(): void {
  getPlugin()?.app.login.doAppLogout();
}

export function Swing2AppBridge(): null {
  // 동기화한 유저 id — Supabase 가 탭 포커스 복귀마다 SIGNED_IN 을 재발화하므로 같은 유저면 native 재로그인 스킵.
  // useRef 사용 (useAuth 와 동일 패턴) — 리렌더/리마운트에도 보존.
  const lastSyncedUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    const ua = navigator.userAgent;
    const isSwingApp = ua.includes("swing2app") || ua.includes("Swing2App");

    if (!isSwingApp) return;

    const script = document.createElement("script");
    script.src = "https://pcdn2.swing2app.co.kr/swing_public_src/v3/2025_10_27_001/js/swing_app_on_web.js";
    script.async = true;
    document.head.appendChild(script);

    let unsubscribe: (() => void) | null = null;

    idle(() => {
      void import("@/lib/supabase/client").then(({ createClient }) => {
        const supabase = createClient();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN" && session?.user && session.user.id !== lastSyncedUserIdRef.current) {
            lastSyncedUserIdRef.current = session.user.id;
            syncLogin(session.user as MinimalUser);
          } else if (event === "SIGNED_OUT") {
            lastSyncedUserIdRef.current = null;
            syncLogout();
          }
        });
        unsubscribe = () => subscription.unsubscribe();
      });
    }, SWING_IDLE_TIMEOUT_MS);

    return () => unsubscribe?.();
  }, []);

  return null;
}
