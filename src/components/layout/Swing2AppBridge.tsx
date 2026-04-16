// @client-reason: Swing2App JS bridge requires browser APIs (window, script injection)
"use client";

import { useEffect } from "react";

interface Swing2AppPlugin {
  app: {
    login: {
      doAppLogin: (userId: string, userName: string) => void;
      doAppLogout: () => void;
    };
  };
}

interface MinimalUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, string>;
}

function getPlugin(): Swing2AppPlugin | null {
  const w = typeof globalThis !== "undefined" ? globalThis : null;
  return (w as unknown as { swingWebViewPlugin?: Swing2AppPlugin } | null)?.swingWebViewPlugin ?? null;
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

/**
 * Swing2App WebView 앱 브릿지
 * - JS SDK 로드
 * - 로그인 상태 동기화 (doAppLogin / doAppLogout)
 *
 * Supabase client는 lazy import — 정적 의존성에서 빼서 ~180KB 청크가
 * 홈 초기 페이로드에서 분리되도록 함.
 */
export function Swing2AppBridge(): null {
  useEffect(() => {
    const ua = navigator.userAgent;
    const isSwingApp = ua.includes("swing2app") || ua.includes("Swing2App");

    if (isSwingApp) {
      const script = document.createElement("script");
      script.src = "https://pcdn2.swing2app.co.kr/swing_public_src/v3/2025_10_27_001/js/swing_app_on_web.js";
      script.async = true;
      document.head.appendChild(script);
    }

    let unsubscribe: (() => void) | null = null;
    const idle = (cb: () => void): void => {
      const ric = (globalThis as unknown as { requestIdleCallback?: (fn: () => void, opts?: { timeout?: number }) => number }).requestIdleCallback;
      if (ric) ric(cb, { timeout: 2000 });
      else globalThis.setTimeout(cb, 1500);
    };

    idle(() => {
      void import("@/lib/supabase/client").then(({ createClient }) => {
        const supabase = createClient();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN" && session?.user) syncLogin(session.user as MinimalUser);
          else if (event === "SIGNED_OUT") syncLogout();
        });
        unsubscribe = () => { subscription.unsubscribe(); };
      });
    });

    return () => { unsubscribe?.(); };
  }, []);

  return null;
}
