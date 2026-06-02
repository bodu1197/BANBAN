import type { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SIM_ANON_COOKIE } from "@/lib/beauty-sim/shared";

// 서버 전용 식별 로직 (cookies/createClient 사용). 순수 상수/타입은 ./shared 참조.

export interface SimIdentity {
  /** 쿼터 식별자: "user:<id>" 또는 "anon:<uuid>" */
  identity: string;
  /** 로그인 사용자 id (비로그인 시 null) */
  userId: string | null;
  /** 비로그인 익명 id (로그인 시 null) */
  anonId: string | null;
  /** 이번 요청에서 새로 발급한 익명 id 인지 (쿠키 설정 필요) */
  isNewAnon: boolean;
}

/**
 * 요청 주체를 해석한다. 로그인 → user:<id>, 비로그인 → anon 쿠키(없으면 새로 발급).
 * id 는 서버 세션/쿠키에서만 취득하며 클라이언트 입력을 신뢰하지 않는다.
 */
export async function resolveSimIdentity(request: NextRequest): Promise<SimIdentity> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    return { identity: `user:${user.id}`, userId: user.id, anonId: null, isNewAnon: false };
  }

  const existing = request.cookies.get(SIM_ANON_COOKIE)?.value;
  if (existing) {
    return { identity: `anon:${existing}`, userId: null, anonId: existing, isNewAnon: false };
  }

  const fresh = globalThis.crypto.randomUUID();
  return { identity: `anon:${fresh}`, userId: null, anonId: fresh, isNewAnon: true };
}

/**
 * 익명 식별 쿠키를 응답에 설정한다(신규 발급 시).
 * 1년 유지: 동일 익명 사용자의 식별 연속성 확보(만료로 쿼터를 우회하지 못하게). httpOnly UUID로 PII 없음.
 */
export function setAnonCookie(res: NextResponse, anonId: string): void {
  res.cookies.set(SIM_ANON_COOKIE, anonId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}
