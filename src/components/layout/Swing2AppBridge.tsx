// @client-reason: Swing2App JS bridge requires browser APIs (window, script injection)
"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Swing2AppPlugin {
  app: {
    login: {
      doAppLogin: (userId: string, userName: string) => void;
      doAppLogout: () => void;
    };
  };
}

function getPlugin(): Swing2AppPlugin | null {
  const w = typeof globalThis !== "undefined" ? globalThis : null;
  return (w as unknown as { swingWebViewPlugin?: Swing2AppPlugin } | null)?.swingWebViewPlugin ?? null;
}

function getUserDisplayName(user: User): string {
  const meta = user.user_metadata as Record<string, string> | undefined;
  return meta?.username ?? meta?.nickname ?? user.email ?? "user";
}

function syncLogin(user: User): void {
  getPlugin()?.app.login.doAppLogin(user.id, getUserDisplayName(user));
}

function syncLogout(): void {
  getPlugin()?.app.login.doAppLogout();
}

/**
 * Swing2App WebView 앱 브릿지
 * - JS SDK 로드
 * - 로그인 상태 동기화 (doAppLogin / doAppLogout)
 */
export function Swing2AppBridge(): null {
  useEffect(() => {
    // Only load Swing2App SDK if the user agent indicates it's the Swing2App WebView container
    const ua = navigator.userAgent;
    const isSwingApp = ua.includes("swing2app") || ua.includes("Swing2App");
    
    if (isSwingApp) {
      const script = document.createElement("script");
      script.src = "https://pcdn2.swing2app.co.kr/swing_public_src/v3/2025_10_27_001/js/swing_app_on_web.js";
      script.async = true;
      document.head.appendChild(script);
    }

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) syncLogin(session.user);
      else if (event === "SIGNED_OUT") syncLogout();
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  return null;
}
