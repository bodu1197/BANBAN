import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getProviderSlug } from "@/lib/auth-labels";

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

type ConflictProfile = Readonly<{ id: string; type_social: string | null }>;

/** 같은 이메일로 다른 id 의 active profile 이 있는지 확인 (중복 가입 차단) */
async function findEmailConflict(
  adminClient: ReturnType<typeof createAdminClient>,
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

async function handleCallback(request: Request, code: string | null, next: string): Promise<NextResponse> {
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

  try {
    await adminClient.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", user.id);
    await adminClient.from("artists").update({ status: "active" }).eq("user_id", user.id).eq("status", "dormant");
  } catch {
    // eslint-disable-next-line no-console
    console.error("[Auth Callback] Post-login tasks failed");
  }

  return NextResponse.redirect(getRedirectUrl(request, origin, next));
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  return handleCallback(request, searchParams.get("code"), sanitizeNext(searchParams.get("next")));
}

// Apple Sign In sends callback as POST with form data
export async function POST(request: Request): Promise<NextResponse> {
  const formData = await request.formData();
  const code = formData.get("code") as string | null;
  const state = formData.get("state") as string | null;

  // Supabase encodes the next path in the state parameter
  let next = "/";
  if (state) {
    try {
      const decoded = atob(state);
      const parsed = JSON.parse(decoded) as Record<string, string>;
      next = sanitizeNext(parsed.next ?? null);
    } catch {
      next = sanitizeNext(null);
    }
  }

  return handleCallback(request, code, next);
}
