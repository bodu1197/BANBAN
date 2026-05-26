"use server";

import { getOAuthUrl, type OAuthResult } from "@/lib/supabase/auth";
import type { OAuthProvider } from "@/lib/auth/oauth-providers";

// turbopack 제약: "use server" 파일은 type re-export 금지.
// OAuthProvider 는 oauth-providers.ts 에서 직접 type import.
export async function loginWithProvider(provider: OAuthProvider): Promise<OAuthResult> {
  return getOAuthUrl(provider);
}
