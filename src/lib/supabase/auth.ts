"use server";

import { createClient } from "./server";
import { redirect } from "next/navigation";
import type { User, Session } from "@supabase/supabase-js";

export type OAuthProvider = "kakao" | "google" | "apple";

export async function getOAuthUrl(provider: OAuthProvider): Promise<string> {
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://banunni.com";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=/`,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    return `/login?error=oauth_error`;
  }

  return data.url;
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
