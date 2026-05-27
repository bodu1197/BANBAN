// @client-reason: Swing2App JS bridge requires browser APIs (window, script injection)
"use client";

import { useEffect } from "react";

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
  useEffect(() => {
    const ua = navigator.userAgent;
    const isSwingApp = ua.includes("swing2app") || ua.includes("Swing2App");

    if (!isSwingApp) return;

    const script = document.createElement("script");
    script.src = "https://pcdn2.swing2app.co.kr/swing_public_src/v3/2025_10_27_001/js/swing_app_on_web.js";
    script.async = true;
    document.head.appendChild(script);

    let unsubscribe: (() => void) | null = null;
    const idle = (cb: () => void): void => {
      const ric = typeof window !== "undefined" ? window.requestIdleCallback : undefined;
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
        unsubscribe = () => subscription.unsubscribe();
      });
    });

    return () => unsubscribe?.();
  }, []);

  return null;
}
