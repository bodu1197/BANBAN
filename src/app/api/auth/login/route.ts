import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

interface ProfileRow {
  id: string;
  username: string;
  email: string | null;
  password: string | null;
  type_social: string | null;
  social_id: string | null;
  nickname: string | null;
}

interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

const SOCIAL_LABELS: Record<string, string> = {
  KAKAO: "카카오",
  GOOGLE: "구글",
  APPLE: "애플",
};

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

async function lookupProfile(
  supabase: SupabaseClient,
  username: string
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, email, password, type_social, social_id, nickname")
    .eq("username", username)
    .single();

  if (error) return null;
  return data as ProfileRow;
}

function checkSocialLoginError(profile: ProfileRow): string | null {
  if (!profile.type_social || profile.type_social === "NONE") return null;
  const label = SOCIAL_LABELS[profile.type_social] || profile.type_social;
  return `${label} 로그인으로 가입된 계정입니다. ${label} 로그인을 이용해주세요.`;
}

async function verifyPassword(password: string, hashedPassword: string | null): Promise<boolean> {
  if (!hashedPassword) return false;
  return bcrypt.compare(password, hashedPassword);
}

async function createOrUpdateAuthUser(
  adminClient: SupabaseClient<Database>,
  profile: ProfileRow,
  email: string,
  password: string
): Promise<{ success: boolean; email: string }> {
  const { data: authUser } = await adminClient.auth.admin.getUserById(profile.id);

  if (!authUser.user) {
    // Try with original email first
    const { error } = await adminClient.auth.admin.createUser({
      id: profile.id,
      email,
      password,
      email_confirm: true,
      user_metadata: { username: profile.username, nickname: profile.nickname },
    });

    if (!error) return { success: true, email };

    // Email already taken by another auth user → use fallback email
    if (error.message?.includes("already been registered")) {
      const fallbackEmail = `${profile.username}@legacy.howtattoo.com`;
      const { error: retryError } = await adminClient.auth.admin.createUser({
        id: profile.id,
        email: fallbackEmail,
        password,
        email_confirm: true,
        user_metadata: { username: profile.username, nickname: profile.nickname },
      });
      if (!retryError) return { success: true, email: fallbackEmail };
    }

    return { success: false, email };
  }

  await adminClient.auth.admin.updateUserById(profile.id, { password });
  return { success: true, email: authUser.user.email ?? email };
}

async function generateSessionTokens(
  adminClient: SupabaseClient<Database>,
  email: string
): Promise<SessionTokens | null> {
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: "/" },
  });

  if (linkError || !linkData.properties?.hashed_token) {
    // eslint-disable-next-line no-console
    console.error("Failed to generate link:", linkError);
    return null;
  }

  const { data: sessionData, error: sessionError } = await adminClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });

  if (sessionError || !sessionData.session) {
    // eslint-disable-next-line no-console
    console.error("Failed to verify OTP:", sessionError);
    return null;
  }

  return {
    accessToken: sessionData.session.access_token,
    refreshToken: sessionData.session.refresh_token,
  };
}

async function setSessionCookies(tokens: SessionTokens): Promise<void> {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

  const supabaseWithCookies = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });

  await supabaseWithCookies.auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });
}

function validateCredentials(
  profile: ProfileRow | null,
  username: string,
  password: string
): NextResponse | null {
  if (!username || !password) {
    return jsonError("아이디와 비밀번호를 입력해주세요", 400);
  }
  if (!profile) {
    return jsonError("아이디 또는 비밀번호가 일치하지 않습니다", 401);
  }
  const socialError = checkSocialLoginError(profile);
  if (socialError) {
    return jsonError(socialError, 400);
  }
  if (!profile.password) {
    return jsonError("비밀번호 재설정이 필요합니다. 비밀번호 찾기를 이용해주세요.", 400);
  }
  return null;
}

async function authenticateAndCreateSession(
  adminClient: SupabaseClient<Database>,
  profile: ProfileRow,
  password: string
): Promise<NextResponse | null> {
  const preferredEmail = profile.email || `${profile.username}@legacy.howtattoo.com`;

  const authResult = await createOrUpdateAuthUser(adminClient, profile, preferredEmail, password);
  if (!authResult.success) {
    return jsonError("사용자 생성에 실패했습니다", 500);
  }

  const tokens = await generateSessionTokens(adminClient, authResult.email);
  if (!tokens) {
    return jsonError("세션 생성에 실패했습니다. 잠시 후 다시 시도해주세요.", 500);
  }

  await setSessionCookies(tokens);
  await reactivateOnLogin(adminClient, profile.id);

  return NextResponse.json({
    success: true,
    user: { id: profile.id, email: authResult.email, username: profile.username, nickname: profile.nickname },
    message: "로그인 성공",
  });
}

async function reactivateOnLogin(adminClient: SupabaseClient<Database>, userId: string): Promise<void> {
  await adminClient.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", userId);
  await adminClient.from("artists").update({ status: "active" }).eq("user_id", userId).eq("status", "dormant");
}

async function processLogin(
  username: string,
  password: string
): Promise<NextResponse> {
  const adminClient = createAdminClient();
  const profile = await lookupProfile(adminClient, username);

  const validationError = validateCredentials(profile, username, password);
  if (validationError) return validationError;

  const isValid = await verifyPassword(password, profile?.password ?? null);
  if (!isValid) {
    return jsonError("아이디 또는 비밀번호가 일치하지 않습니다", 401);
  }

  const result = await authenticateAndCreateSession(adminClient, profile as ProfileRow, password);
  return result ?? jsonError("세션 생성에 실패했습니다", 500);
}

/**
 * 레거시 호환 로그인 API
 * - username(아이디)으로만 로그인
 * - profiles 테이블의 bcrypt 비밀번호 검증
 * - Supabase Auth 세션 생성 및 반환
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);
  const { success } = rateLimit({ key: `login:${ip}`, limit: 5, windowMs: 60_000 });
  if (!success) return rateLimitResponse() as NextResponse;

  try {
    const body = await request.json();
    const username = body.username || body.identifier; // 호환성 유지
    const { password } = body;
    return await processLogin(username, password);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Login error:", error);
    return jsonError("서버 오류가 발생했습니다", 500);
  }
}
