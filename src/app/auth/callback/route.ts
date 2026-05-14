import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

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

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const adminClient = createAdminClient();
      await adminClient.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", user.id);
      await adminClient.from("artists").update({ status: "active" }).eq("user_id", user.id).eq("status", "dormant");
    }
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
