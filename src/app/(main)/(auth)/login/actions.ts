"use server";

import { getOAuthUrl, type OAuthProvider, type OAuthResult } from "@/lib/supabase/auth";

export async function loginWithProvider(provider: OAuthProvider): Promise<OAuthResult> {
  return getOAuthUrl(provider);
}
