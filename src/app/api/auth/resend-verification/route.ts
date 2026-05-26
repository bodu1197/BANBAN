import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import type { Database } from "@/types/database";

// 가입 확인 이메일 재발송 — SignupFormStep 의 EmailSentView 에서 호출.
// rate-limit: IP 1회/분 + 이메일 3회/시간 → 스팸 방지.

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PER_EMAIL_LIMIT = 3;
const PER_EMAIL_WINDOW_MS = 60 * 60 * 1000;

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function isOriginAllowed(request: NextRequest, siteUrl: string): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(siteUrl).host;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://banunni.com").trim();
  if (!isOriginAllowed(request, siteUrl)) return jsonError("허용되지 않은 요청입니다", 403);

  const ip = getClientIp(request);
  const { success: ipOk } = rateLimit({ key: `resend:${ip}`, limit: 1, windowMs: 60_000 });
  if (!ipOk) return rateLimitResponse() as NextResponse;

  let email: string;
  try {
    const body = await request.json();
    email = String(body.email ?? "").trim().toLowerCase();
  } catch {
    return jsonError("잘못된 요청입니다", 400);
  }

  if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) {
    return jsonError("올바른 이메일 주소를 입력해주세요", 400);
  }

  const { success: emailOk } = rateLimit({
    key: `resend-email:${email}`,
    limit: PER_EMAIL_LIMIT,
    windowMs: PER_EMAIL_WINDOW_MS,
  });
  if (!emailOk) {
    return jsonError("이 이메일 주소로의 재발송 한도를 초과했습니다. 1시간 후 다시 시도해주세요", 429);
  }

  const anonClient = createServerClient<Database>(
    (process.env.NEXT_PUBLIC_SUPABASE_URL as string).trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string).trim(),
    { cookies: { getAll() { return []; }, setAll() { /* noop */ } } },
  );

  const { error } = await anonClient.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${siteUrl}/login` },
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("Resend verification failed:", error);
    return jsonError("재발송에 실패했습니다. 잠시 후 다시 시도해주세요", 500);
  }

  return NextResponse.json({ success: true });
}
