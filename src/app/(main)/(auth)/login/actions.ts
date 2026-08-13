"use server";

import { getOAuthUrl, type OAuthResult } from "@/lib/supabase/auth";
import { sanitizeNext } from "@/lib/auth/next-path";
import type { OAuthProvider } from "@/lib/auth/oauth-providers";

// turbopack 제약: "use server" 파일은 type re-export 금지.
// OAuthProvider 는 oauth-providers.ts 에서 직접 type import.
export async function loginWithProvider(provider: OAuthProvider, next?: string): Promise<OAuthResult> {
  // 클라이언트가 보낸 값이라 서버에서 한 번 더 거른다(오픈 리다이렉트 차단).
  return getOAuthUrl(provider, { next: sanitizeNext(next) });
}
