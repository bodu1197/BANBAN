// @client-reason: Client-side authentication utilities
"use client";

import { createClient } from "./client";

/**
 * 이메일+비밀번호 로그인 (Supabase Auth)
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ error: Error | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const messageMap: Record<string, string> = {
      "Invalid login credentials": "이메일 또는 비밀번호가 일치하지 않습니다",
      "Email not confirmed": "이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.",
    };
    return { error: new Error(messageMap[error.message] ?? error.message) };
  }

  return { error: null };
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
 * 비밀번호 재설정 이메일 보내기
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
