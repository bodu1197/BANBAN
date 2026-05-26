"use server";

import { getOAuthUrl, type OAuthResult } from "@/lib/supabase/auth";
import type { OAuthProvider } from "@/lib/auth/oauth-providers";
import type { SignupRole } from "./types";

// 가입 페이지에서 SNS 가입 — 사용자가 role 을 명시 선택했으므로 intent 항상 전달.
// callback 이 intent=artist 인 경우 자동으로 profiles.role='artist' 설정.
export async function signupWithProvider(
  provider: OAuthProvider,
  role: SignupRole,
): Promise<OAuthResult> {
  const next = role === "artist" ? "/mypage" : "/";
  return getOAuthUrl(provider, { intent: role, next });
}
