import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";
import bcrypt from "bcryptjs";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import type { Database } from "@/types/database";

type AdminClient = ReturnType<typeof createAdminClient>;

interface SignupData {
  username: string;
  nickname: string; // auto-generated if not provided
  password: string;
  contact?: string;
  email: string;
}

function generateNickname(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const buf = new Uint8Array(4);
  crypto.getRandomValues(buf);
  let suffix = "";
  for (const b of buf) suffix += chars[b % chars.length];
  return `ban_${suffix}`;
}

// 아이디: 영문자로 시작, 영문+숫자만, 4-12자
const USERNAME_REGEX = /^[A-Za-z][A-Za-z0-9]{3,11}$/;
// 닉네임: 한글, 영문, 숫자, 밑줄만 허용, 2-12자 (이모지/특수문자 차단)
const NICKNAME_REGEX = /^[가-힣A-Za-z0-9_]{2,12}$/;
// 비밀번호: 영문+숫자 조합 필수
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]+$/;
// 연락처: 010으로 시작
const CONTACT_REGEX = /^010\d{8}$/;
// 비밀번호 최소 길이
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function jsonSuccess(data: Record<string, unknown>): NextResponse {
  return NextResponse.json({ success: true, ...data });
}

function validateUsername(username: string): string | null {
  const isValid = username && USERNAME_REGEX.test(username);
  return isValid ? null : "아이디는 영문자로 시작하고, 영문+숫자 4-12자여야 합니다";
}

function validateNickname(nickname: string): string | null {
  const isValid = nickname && NICKNAME_REGEX.test(nickname);
  return isValid ? null : "닉네임은 한글, 영문, 숫자, 밑줄만 사용 가능 (2-12자)";
}

function validatePassword(password: string): string | null {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return "비밀번호는 8자 이상이어야 합니다";
  }
  return PASSWORD_REGEX.test(password) ? null : "비밀번호는 영문과 숫자를 포함해야 합니다";
}

function validateContact(contact: string): string | null {
  const normalized = contact?.replaceAll("-", "") || "";
  const isValid = CONTACT_REGEX.test(normalized);
  return isValid ? null : "연락처는 010으로 시작하는 11자리 숫자여야 합니다";
}

function validateEmail(email: string): string | null {
  const isValid = email && EMAIL_REGEX.test(email);
  return isValid ? null : "올바른 이메일 주소를 입력해주세요";
}

function validateSignupData(data: SignupData): string | null {
  return (
    validateUsername(data.username) ??
    validateNickname(data.nickname) ??
    validatePassword(data.password) ??
    (data.contact ? validateContact(data.contact) : null) ??
    validateEmail(data.email)
  );
}

/** 실패한 회원가입으로 생긴 orphan profile 정리 (password 없음 = 완료 안 된 가입) */
async function cleanOrphanProfile(
  supabase: AdminClient,
  field: string,
  value: string
): Promise<void> {
  const { data: orphan } = await supabase
    .from("profiles")
    .select("id, password")
    .eq(field, value)
    .is("deleted_at", null)
    .single();

  if (orphan && !orphan.password) {
    await supabase.from("profiles").delete().eq("id", orphan.id);
    await supabase.auth.admin.deleteUser(orphan.id).catch(() => {/* no-op */});
  }
}

async function checkDuplicates(
  supabase: AdminClient,
  data: SignupData
): Promise<string | null> {
  // 이전 실패한 가입의 orphan profile 정리
  await cleanOrphanProfile(supabase, "username", data.username);
  await cleanOrphanProfile(supabase, "nickname", data.nickname);
  await cleanOrphanProfile(supabase, "email", data.email);

  const { data: byUsername } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", data.username)
    .is("deleted_at", null)
    .single();

  if (byUsername) return "이미 존재하는 아이디입니다";

  const { data: byNickname } = await supabase
    .from("profiles")
    .select("id")
    .eq("nickname", data.nickname)
    .is("deleted_at", null)
    .single();

  if (byNickname) return "이미 존재하는 닉네임입니다";

  const { data: byEmail } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", data.email)
    .is("deleted_at", null)
    .single();

  if (byEmail) return "해당 이메일로 가입된 계정이 이미 존재합니다";

  return null;
}

async function signUpAuth(
  data: SignupData
): Promise<{ userId: string } | { error: string }> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL as string).trim();
  const anonClient = createServerClient<Database>(
    (process.env.NEXT_PUBLIC_SUPABASE_URL as string).trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string).trim(),
    { cookies: { getAll() { return []; }, setAll() { /* noop */ } } },
  );

  const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: { username: data.username, nickname: data.nickname },
      emailRedirectTo: `${siteUrl}/login`,
    },
  });

  if (signUpError || !signUpData.user) {
    // eslint-disable-next-line no-console
    console.error("Signup failed:", signUpError);
    return { error: signUpError?.message ?? "회원가입에 실패했습니다" };
  }

  if (signUpData.user.identities?.length === 0) {
    return { error: "이미 가입된 이메일입니다" };
  }

  return { userId: signUpData.user.id };
}

async function createUser(
  adminClient: AdminClient,
  data: SignupData
): Promise<{ userId: string } | { error: string }> {
  const authResult = await signUpAuth(data);
  if ("error" in authResult) return authResult;

  const hashedPassword = await bcrypt.hash(data.password, 10);
  const normalizedContact = data.contact?.replaceAll("-", "") ?? "";

  const profileData = {
    id: authResult.userId,
    username: data.username,
    nickname: data.nickname,
    email: data.email,
    password: hashedPassword,
    contact: normalizedContact || null,
    type_social: "NONE",
    is_admin: false,
    language: "ko",
    message_push_enabled: true,
  };
  const { error: profileError } = await adminClient
    .from("profiles")
    .upsert(profileData, { onConflict: "id" });

  if (profileError) {
    // eslint-disable-next-line no-console
    console.error("Profile creation failed:", profileError);
    await adminClient.auth.admin.deleteUser(authResult.userId);
    return { error: `회원가입에 실패했습니다: ${profileError.message}` };
  }

  return { userId: authResult.userId };
}

function parseRequestBody(body: Record<string, unknown>): SignupData {
  const nickname = body.nickname ? String(body.nickname).trim() : "";
  return {
    username: String(body.username ?? "").trim(),
    nickname: nickname || generateNickname(),
    password: String(body.password ?? ""),
    contact: body.contact ? String(body.contact).trim() : undefined,
    email: String(body.email ?? "").trim().toLowerCase(),
  };
}

async function findExistingUser(
  supabase: AdminClient,
  data: SignupData
): Promise<{ id: string; username: string } | null> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, username, password")
    .eq("username", data.username)
    .eq("email", data.email)
    .is("deleted_at", null)
    .not("password", "is", null)
    .single();
  return existing ? { id: existing.id as string, username: existing.username as string } : null;
}

async function processSignup(data: SignupData): Promise<NextResponse> {
  const validationError = validateSignupData(data);
  if (validationError) return jsonError(validationError, 400);

  const supabase = createAdminClient();

  const existingUser = await findExistingUser(supabase, data);
  if (existingUser) return jsonSuccess({ message: "이미 가입된 계정입니다. 로그인해주세요.", user: existingUser });

  const duplicateError = await checkDuplicates(supabase, data);
  if (duplicateError) return jsonError(duplicateError, 400);

  const result = await createUser(supabase, data);
  if ("error" in result) return jsonError(result.error, 500);

  return jsonSuccess({
    message: "이메일 인증 후 로그인할 수 있습니다",
    emailVerificationRequired: true,
    user: {
      id: result.userId,
      username: data.username,
      nickname: data.nickname,
      email: data.email,
    },
  });
}

/**
 * 레거시 호환 회원가입 API
 * - username, nickname, password, contact, email 필수
 * - bcrypt로 비밀번호 해시
 * - profiles 테이블과 Supabase Auth에 동시 생성
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);
  const { success } = rateLimit({ key: `signup:${ip}`, limit: 3, windowMs: 60_000 });
  if (!success) return rateLimitResponse() as NextResponse;

  try {
    const body = await request.json();
    const data = parseRequestBody(body);
    return await processSignup(data);
  } catch {
    return jsonError("서버 오류가 발생했습니다", 500);
  }
}
