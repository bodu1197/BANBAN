// @client-reason: User state hydrated from supabase client to keep MainLayout static (ISR)
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STRINGS } from "@/lib/strings";

const NotificationBell = dynamic(() => import("./NotificationBell").then((m) => m.NotificationBell));
const HeaderMobileMenu = dynamic(() => import("./HeaderMobileMenu").then((m) => m.HeaderMobileMenu));
const LoggedInUserMenu = dynamic(() => import("./LoggedInUserMenu").then((m) => m.LoggedInUserMenu));

interface HeaderUser {
  id: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
}

interface SupabaseUserMeta {
  nickname?: string;
  name?: string;
  avatar_url?: string;
}

interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: SupabaseUserMeta;
}

function toHeaderUser(u: SupabaseUser): HeaderUser {
  const meta = u.user_metadata;
  return {
    id: u.id,
    email: u.email,
    name: meta?.nickname ?? meta?.name,
    avatarUrl: meta?.avatar_url,
  };
}

function idle(cb: () => void): void {
  const ric = (globalThis as unknown as { requestIdleCallback?: (fn: () => void, opts?: { timeout?: number }) => number }).requestIdleCallback;
  if (ric) ric(cb, { timeout: 2000 });
  else globalThis.setTimeout(cb, 800);
}

interface SupabaseAuthClient {
  getUser(): Promise<{ data: { user: SupabaseUser | null } }>;
  onAuthStateChange(cb: (event: string, session: { user?: SupabaseUser } | null) => void): { data: { subscription: { unsubscribe: () => void } } };
}

function bindAuth(
  auth: SupabaseAuthClient,
  setUser: (u: HeaderUser | null) => void,
  isCancelled: () => boolean,
): () => void {
  void auth.getUser().then(({ data }) => {
    if (isCancelled() || !data.user) return;
    setUser(toHeaderUser(data.user));
  });
  const { data: { subscription } } = auth.onAuthStateChange((_e, session) => {
    if (isCancelled()) return;
    setUser(session?.user ? toHeaderUser(session.user) : null);
  });
  return () => { subscription.unsubscribe(); };
}

function useHeaderUser(): HeaderUser | null {
  const [user, setUser] = useState<HeaderUser | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;
    const isCancelled = (): boolean => cancelled;

    idle(() => {
      void import("@/lib/supabase/client").then(({ createClient }) => {
        if (cancelled) return;
        unsubscribe = bindAuth(createClient().auth as unknown as SupabaseAuthClient, setUser, isCancelled);
      });
    });

    return () => { cancelled = true; unsubscribe?.(); };
  }, []);

  return user;
}

export function HeaderUserSection(): React.ReactElement {
  const user = useHeaderUser();

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
