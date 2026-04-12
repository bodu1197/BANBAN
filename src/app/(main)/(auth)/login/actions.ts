"use server";

import { getOAuthUrl, type OAuthProvider } from "@/lib/supabase/auth";

export async function loginWithProvider(provider: OAuthProvider): Promise<string> {
  return getOAuthUrl(provider);
}
