import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

interface ProfileRow {
  id: string;
  username: string;
  nickname: string | null;
  email: string | null;
  password: string | null;
  type_social: string | null;
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function isSocialAccount(profile: ProfileRow): boolean {
  return !!profile.type_social && profile.type_social !== "NONE";
}

async function ensureAuthUser(
  adminClient: SupabaseClient,
  profile: ProfileRow,
  email: string,
): Promise<{ error: string | null }> {
  const { data: authUser } = await adminClient.auth.admin.getUserById(profile.id);
  if (authUser.user) return { error: null };

  const tempBuf = new Uint8Array(16);
  crypto.getRandomValues(tempBuf);
  const tempPassword = `reset_${Date.now()}_${Array.from(tempBuf, (b) => b.toString(36)).join("")}`;
  const { error: createError } = await adminClient.auth.admin.createUser({
    id: profile.id,
    email,
    password: profile.password ? undefined : tempPassword,
    email_confirm: true,
    user_metadata: { username: profile.username, nickname: profile.nickname },
  });

  if (!createError) return { error: null };

  // 이메일 충돌 시 fallback 이메일로 재시도
  if (!createError.message?.includes("already been registered")) {
    return { error: "사용자 생성에 실패했습니다. 고객센터에 문의해주세요." };
  }

  const fallbackEmail = `${profile.username}@legacy.howtattoo.com`;
  const { error: retryError } = await adminClient.auth.admin.createUser({
    id: profile.id,
    email: fallbackEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { username: profile.username, nickname: profile.nickname },
  });

  return retryError
    ? { error: "사용자 생성에 실패했습니다. 고객센터에 문의해주세요." }
    : { error: null };
}

async function sendResetEmail(
  adminClient: SupabaseClient,
  email: string,
): Promise<NextResponse> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://howtattoo.com";
  const { error } = await adminClient.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Reset password email error:", error);
    return jsonError("이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.", 500);
  }

  return NextResponse.json({ success: true });
}

/**
 * 레거시 호환 비밀번호 재설정 이메일 발송
 * - profiles 테이블에서 이메일로 사용자 조회
 * - auth.users에 없으면 생성 후 재설정 이메일 발송
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);
  const { success } = rateLimit({ key: `reset-pw:${ip}`, limit: 3, windowMs: 60_000 });
  if (!success) return rateLimitResponse() as NextResponse;

  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return jsonError("이메일을 입력해주세요", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const adminClient = createAdminClient();

    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, username, nickname, email, password, type_social")
      .eq("email", normalizedEmail)
      .is("deleted_at", null)
      .single();

    // 보안상 이메일 존재 여부를 알려주지 않음
    if (!profile) return NextResponse.json({ success: true });

    if (isSocialAccount(profile as ProfileRow)) {
      return jsonError("SNS 로그인으로 가입된 계정입니다. SNS 로그인을 이용해주세요.", 400);
    }

    const { error: ensureError } = await ensureAuthUser(adminClient, profile as ProfileRow, normalizedEmail);
    if (ensureError) return jsonError(ensureError, 500);

    return sendResetEmail(adminClient, normalizedEmail);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Reset password error:", error);
    return jsonError("서버 오류가 발생했습니다", 500);
  }
}

/**
 * 레거시 호환 비밀번호 변경
 * - auth.users와 profiles 테이블 모두 업데이트
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);
  const { success } = rateLimit({ key: `update-pw:${ip}`, limit: 5, windowMs: 60_000 });
  if (!success) return rateLimitResponse() as NextResponse;

  try {
    const { password, accessToken } = await request.json();
    if (!password || password.length < 6) {
      return jsonError("비밀번호는 6자 이상이어야 합니다", 400);
    }

    const adminClient = createAdminClient();

    const { data: { user }, error: userError } = await adminClient.auth.getUser(accessToken);
    if (userError || !user) {
      return jsonError("인증이 만료되었습니다. 비밀번호 재설정을 다시 요청해주세요.", 401);
    }

    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(user.id, { password });
    if (updateAuthError) return jsonError("비밀번호 변경에 실패했습니다", 500);

    // profiles 테이블 bcrypt 비밀번호도 동기화
    const hashedPassword = await bcrypt.hash(password, 10);
    await adminClient.from("profiles").update({ password: hashedPassword }).eq("id", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Update password error:", error);
    return jsonError("서버 오류가 발생했습니다", 500);
  }
}
