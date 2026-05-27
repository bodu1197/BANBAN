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

function readUserFromCookie(): HeaderUser | null {
  const key = getStorageKey();
  if (!key) return null;

  try {
    const cookies = parseCookies();

    const chunks: string[] = [];
    if (cookies[key]) {
      chunks.push(cookies[key]);
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

    const session: unknown = JSON.parse(raw);
    if (typeof session !== "object" || session === null) return null;

    const user = (session as Record<string, unknown>).user;
    if (typeof user !== "object" || user === null) return null;

    const u = user as Record<string, unknown>;
    if (typeof u.id !== "string") return null;

    const meta = typeof u.user_metadata === "object" && u.user_metadata !== null
      ? u.user_metadata as Record<string, unknown>
      : undefined;

    return {
      id: u.id,
      email: typeof u.email === "string" ? u.email : undefined,
      name: (typeof meta?.nickname === "string" ? meta.nickname : undefined)
        ?? (typeof meta?.name === "string" ? meta.name : undefined),
      avatarUrl: typeof meta?.avatar_url === "string" ? meta.avatar_url : undefined,
    };
  } catch {
    return null;
  }
}

export function HeaderUserSection(): React.ReactElement {
  const [user, setUser] = useState<HeaderUser | null>(null);

  useEffect(() => {
    setUser(readUserFromCookie());
  }, []);

  return (
    <>
      {user ? <NotificationBell userId={user.id} /> : null}
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
