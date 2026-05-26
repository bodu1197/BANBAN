"use server";

import { createClient } from "./server";
import { redirect } from "next/navigation";
import type { User, Session } from "@supabase/supabase-js";
import type { OAuthProvider } from "@/lib/auth/oauth-providers";

export type OAuthResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

interface OAuthOptions {
  /** 콜백 후 이동할 경로 */
  next?: string;
  /** SNS 가입 시 역할 지정 — callback 에서 applyArtistIntent 가 사용 */
  intent?: "artist" | "user";
}

function buildCallbackUrl(siteUrl: string, options: OAuthOptions): string {
  const params = new URLSearchParams();
  params.set("next", options.next ?? "/");
  if (options.intent) params.set("intent", options.intent);
  return `${siteUrl}/auth/callback?${params.toString()}`;
}

export async function getOAuthUrl(
  provider: OAuthProvider,
  options: OAuthOptions = {},
): Promise<OAuthResult> {
  const supabase = await createClient();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://banunni.com").trim();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: buildCallbackUrl(siteUrl, options),
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    return { ok: false, error: error?.message ?? "oauth_error" };
  }

  return { ok: true, url: data.url };
}

export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    return null;
  }

  return session;
}
