// @client-reason: useEffect + useState for hydration-safe cookie-based auth state
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STRINGS } from "@/lib/strings";
import { SUPABASE_URL } from "@/lib/supabase/config";

const NotificationBell = dynamic(() => import("./NotificationBell").then((m) => m.NotificationBell));
const HeaderMobileMenu = dynamic(() => import("./HeaderMobileMenu").then((m) => m.HeaderMobileMenu));
const LoggedInUserMenu = dynamic(() => import("./LoggedInUserMenu").then((m) => m.LoggedInUserMenu));

export interface HeaderUser {
  id: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
}

const BASE64_PREFIX = "base64-";

function getStorageKey(): string {
  try {
    return `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
  } catch {
    return "";
  }
}

function base64UrlDecode(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function parseCookies(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of document.cookie.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    result[part.substring(0, idx).trim()] = part.substring(idx + 1);
  }
  return result;
}

function strOrUndef(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

/** 청크 쿠키(키 또는 key.0, key.1 …) 를 합치고 base64 prefix 면 디코드 — 없으면 null. */
function collectSessionRaw(cookies: Record<string, string>, key: string): string | null {
  const chunks: string[] = [];
  // eslint-disable-next-line security/detect-object-injection -- key 는 SUPABASE_URL(신뢰 상수)에서 파생된 auth-token 스토리지 키이며 사용자 입력 아님
  const whole = cookies[key];
  if (whole) {
    chunks.push(whole);
  } else {
    for (let i = 0; ; i++) {
      const chunk = cookies[`${key}.${i}`];
      if (chunk === undefined) break;
      chunks.push(chunk);
    }
  }
  if (chunks.length === 0) return null;
  let raw = chunks.join("");
  if (raw.startsWith(BASE64_PREFIX)) {
    raw = base64UrlDecode(raw.substring(BASE64_PREFIX.length));
  }
  return raw;
}

/** 세션 객체의 user 에서 헤더 표시용 필드 추출 — 형태 불일치 시 null. */
function extractHeaderUser(user: unknown): HeaderUser | null {
  if (typeof user !== "object" || user === null) return null;
  const u = user as Record<string, unknown>;
  if (typeof u.id !== "string") return null;
  const meta = typeof u.user_metadata === "object" && u.user_metadata !== null
    ? u.user_metadata as Record<string, unknown>
    : undefined;
  return {
    id: u.id,
    email: strOrUndef(u.email),
    name: strOrUndef(meta?.nickname) ?? strOrUndef(meta?.name),
    avatarUrl: strOrUndef(meta?.avatar_url),
  };
}

function readUserFromCookie(): HeaderUser | null {
  const key = getStorageKey();
  if (!key) return null;
  try {
    const raw = collectSessionRaw(parseCookies(), key);
    if (raw === null) return null;
    const session: unknown = JSON.parse(raw);
    if (typeof session !== "object" || session === null) return null;
    return extractHeaderUser((session as Record<string, unknown>).user);
  } catch {
    return null;
  }
}

export function HeaderUserSection(): React.ReactElement {
  const [user, setUser] = useState<HeaderUser | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 쿠키는 클라에서만 읽어 hydration mismatch 방지(의도적 client-only init)
    setUser(readUserFromCookie());
  }, []);

  return (
    <>
      {user ? <NotificationBell /> : null}
      {user ? (
        <LoggedInUserMenu user={user} />
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:inline-flex"
          aria-label={STRINGS.common.login}
          asChild
        >
          <Link href="/login">
            <User className="h-5 w-5" />
          </Link>
        </Button>
      )}
      <HeaderMobileMenu user={user} />
    </>
  );
}
