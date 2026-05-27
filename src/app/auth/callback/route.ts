import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getProviderSlug, normalizeTypeSocial } from "@/lib/auth-labels";
import { ONBOARDING_WINDOW_MS } from "@/lib/onboarding/constants";
import { downloadAndStoreAvatar } from "@/lib/auth/avatar-download";
import type { User, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type AdminClient = ReturnType<typeof createAdminClient>;
type SignupIntent = "artist" | "user" | null;

// 신규 가입자 판별: last_sign_in 과 created_at 차이 < 60초
const NEW_SIGNUP_THRESHOLD_MS = 60 * 1000;

function parseIntent(raw: string | null): SignupIntent {
  if (raw === "artist") return "artist";
  if (raw === "user") return "user";
  return null;
}

function isNewSignup(user: { created_at?: string; last_sign_in_at?: string | null }): boolean {
  if (!user.created_at) return false;
  const createdAtMs = new Date(user.created_at).getTime();
  const lastSignInMs = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : createdAtMs;
  return Math.abs(lastSignInMs - createdAtMs) < NEW_SIGNUP_THRESHOLD_MS;
}

function getRedirectUrl(request: Request, origin: string, path: string): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (process.env.NODE_ENV === "development" || !forwardedHost) {
    return `${origin}${path}`;
  }
  return `https://${forwardedHost}${path}`;
}

function sanitizeNext(param: string | null): string {
  const next = param ?? "/";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

async function safeRun(label: string, op: () => PromiseLike<unknown>): Promise<void> {
  try {
    await op();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`[Auth Callback] ${label} failed:`, e);
  }
}

type ConflictProfile = Readonly<{ id: string; type_social: string | null }>;

/** 같은 이메일로 다른 id 의 active profile 이 있는지 확인 (중복 가입 차단) */
async function findEmailConflict(
  adminClient: AdminClient,
  email: string,
  currentUserId: string,
): Promise<ConflictProfile | null> {
  const { data } = await adminClient
    .from("profiles")
    .select("id, type_social")
    .eq("email", email.toLowerCase())
    .is("deleted_at", null)
    .neq("id", currentUserId)
    .limit(1)
    .maybeSingle();
  return data as ConflictProfile | null;
}

const NICKNAME_REGEX = /^[가-힣A-Za-z0-9_]{2,12}$/;

function deriveNickname(user: User): string {
  const meta = user.user_metadata ?? {};
  const raw = String(meta.full_name ?? meta.name ?? meta.preferred_username ?? "").trim();
  if (raw && NICKNAME_REGEX.test(raw.slice(0, 12))) return raw.slice(0, 12);
  const emailPrefix = (user.email ?? "").split("@")[0].slice(0, 12);
  return NICKNAME_REGEX.test(emailPrefix) ? emailPrefix : "회원";
}

async function ensureProfile(
  adminClient: SupabaseClient<Database>,
  user: User,
): Promise<void> {
  const now = new Date().toISOString();

  const { data: existing } = await adminClient
    .from("profiles")
    .select("id, profile_image_path")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    // 기존 회원: last_login_at 갱신 + profile_image_path 미설정인 SNS 회원에게는 avatar 다운로드 보강
    const update: { last_login_at: string; profile_image_path?: string } = { last_login_at: now };
    if (!existing.profile_image_path) {
      const avatarPath = await downloadAndStoreAvatar(adminClient, user);
      if (avatarPath) update.profile_image_path = avatarPath;
    }
    await adminClient.from("profiles").update(update).eq("id", user.id);
    return;
  }

  const normalizedEmail = (user.email ?? "").toLowerCase();
  const provider = user.app_metadata?.provider as string | undefined;
  // 신규 SNS 가입자: avatar 다운로드 (Google/Kakao). 실패해도 null → fallback (default 이미지)
  const profileImagePath = await downloadAndStoreAvatar(adminClient, user);

  // SNS 신규 가입자: role 기본값 'user' (DB default). intent 가 있으면 후속에서 'artist' 로 변경.
  const { error } = await adminClient.from("profiles").upsert({
    id: user.id,
    email: normalizedEmail,
    nickname: deriveNickname(user),
    username: normalizedEmail,
    type_social: normalizeTypeSocial(provider),
    profile_image_path: profileImagePath,
    is_admin: false,
    language: "ko",
    message_push_enabled: true,
    last_login_at: now,
  }, { onConflict: "id" });

  if (error) throw error;
}

/**
 * intent='artist' SNS 가입자: 5분 윈도우 안에서 role='user' → 'artist' 자동 변경.
 * RLS 트리거가 클라이언트 직접 변경을 차단하므로 service role 로 처리.
 */
async function applyArtistIntent(adminClient: AdminClient, userId: string): Promise<void> {
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (!profile || profile.role !== "user" || !profile.created_at) return;
  const createdAtMs = new Date(profile.created_at).getTime();
  if (Date.now() - createdAtMs >= ONBOARDING_WINDOW_MS) return;
  await adminClient.from("profiles").update({ role: "artist" }).eq("id", userId);
}

async function handleCallback(
  request: Request,
  code: string | null,
  next: string,
  intent: SignupIntent,
): Promise<NextResponse> {
  const { origin } = new URL(request.url);

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
  }

  const adminClient = createAdminClient();

  // 이메일 중복 가입 차단: 같은 이메일로 다른 id 의 active profile 이 있으면
  // 새 auth.users 삭제 후 거부. 사용자가 원래 가입 경로를 안내받도록 type_social 을 슬러그로 전달.
  const conflict = await findEmailConflict(adminClient, user.email, user.id);
  if (conflict) {
    await supabase.auth.signOut();
    await adminClient.auth.admin.deleteUser(user.id).catch(() => {/* no-op */});
    const slug = encodeURIComponent(getProviderSlug(conflict.type_social));
    return NextResponse.redirect(`${origin}/login?error=email_already_registered&method=${slug}`);
  }

  let finalNext = next;
  await safeRun("ensure profile", () => ensureProfile(adminClient, user));
  await safeRun("reactivate dormant artist", () =>
    adminClient.from("artists").update({ status: "active" }).eq("user_id", user.id).eq("status", "dormant"),
  );

  if (intent === "artist") {
    await safeRun("apply artist intent", () => applyArtistIntent(adminClient, user.id));
  }
  // intent 가 없는 신규 가입자 (login 페이지에서 SNS 로 가입) → /onboarding 으로 유형 선택 유도
  if (intent === null && isNewSignup(user)) {
    finalNext = "/onboarding";
  }

  return NextResponse.redirect(getRedirectUrl(request, origin, finalNext));
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  return handleCallback(
    request,
    searchParams.get("code"),
    sanitizeNext(searchParams.get("next")),
    parseIntent(searchParams.get("intent")),
  );
}

// Apple Sign In sends callback as POST with form data
export async function POST(request: Request): Promise<NextResponse> {
  const formData = await request.formData();
  const code = formData.get("code") as string | null;
  const state = formData.get("state") as string | null;

  // Supabase encodes the next path + intent in the state parameter (base64 JSON)
  let next = "/";
  let intent: SignupIntent = null;
  if (state) {
    try {
      const decoded = atob(state);
      const parsed = JSON.parse(decoded) as Record<string, string>;
      next = sanitizeNext(parsed.next ?? null);
      intent = parseIntent(parsed.intent ?? null);
    } catch {
      next = sanitizeNext(null);
    }
  }

  return handleCallback(request, code, next, intent);
}
