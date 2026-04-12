// @client-reason: Client-side authentication utilities
"use client";

import { createClient } from "./client";

interface LegacyLoginResult {
  error: Error | null;
  needsPasswordReset?: boolean;
}

/**
 * 아이디(username)로 로그인 (레거시 호환)
 */
export async function signInWithIdentifier(
  username: string,
  password: string
): Promise<LegacyLoginResult> {
  try {
    const response = await fetch(`${globalThis.location.origin}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      const needsPasswordReset = data.error?.includes("비밀번호 재설정") || false;
      return {
        error: new Error(data.error || "로그인에 실패했습니다"),
        needsPasswordReset,
      };
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err : new Error("로그인 중 오류가 발생했습니다"),
    };
  }
}

/**
 * 로그아웃
 */
export async function signOut(): Promise<{ error: Error | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * 비밀번호 재설정 이메일 보내기 (서버 API 경유 - 레거시 호환)
 */
export async function resetPassword(
  email: string
): Promise<{ error: Error | null }> {
  try {
    const response = await fetch(`${globalThis.location.origin}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: new Error(data.error || "비밀번호 재설정에 실패했습니다") };
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err : new Error("비밀번호 재설정 중 오류가 발생했습니다"),
    };
  }
}

/**
 * 비밀번호 업데이트
 */
export async function updatePassword(
  newPassword: string
): Promise<{ error: Error | null }> {
  const supabase = createClient();

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  return { error };
}
