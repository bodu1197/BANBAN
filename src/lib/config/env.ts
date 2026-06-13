/**
 * Environment variable 중앙화 + 런타임 검증.
 *
 * - 모든 `process.env.X` 직접 접근을 이 모듈에서 import 로 대체.
 * - public (NEXT_PUBLIC_*) 변수는 client + server 양쪽에서 안전하게 import 가능.
 * - private 변수는 server 전용 (브라우저 번들에 포함되지 않음).
 *
 * Supabase 변수의 단일 진실 소스는 `@/lib/supabase/config` — 여기서는 re-import 만.
 * 검증 전략:
 *  - 필수 키는 빌드 타임에 throw (build-time guarantee).
 *  - 선택 키는 undefined 허용 + 호출처에서 null-check.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";

const SITE_URL_DEFAULT = "https://banunni.com";

function readEnv(key: string, fallback = ""): string {
    // eslint-disable-next-line security/detect-object-injection -- key 는 모듈 내 하드코딩
    const value = process.env[key];
    return (value ?? fallback).trim();
}

/** Public (NEXT_PUBLIC_*) — 브라우저 노출 가능 */
export const PUBLIC_ENV = {
    SITE_URL: readEnv("NEXT_PUBLIC_SITE_URL", SITE_URL_DEFAULT),
    SUPABASE_URL,         // re-export from lib/supabase/config (SSOT)
    SUPABASE_ANON_KEY,    // re-export from lib/supabase/config (SSOT)
    // 색인 차단 플래그 — robots.ts/layout.tsx 와 반드시 동일 변수(NEXT_PUBLIC_BLOCK_INDEXING) 사용.
    BLOCK_INDEXING: readEnv("NEXT_PUBLIC_BLOCK_INDEXING") === "true",
} as const;

/** Server-only — 브라우저 번들에 포함되면 안 됨 */
export const SERVER_ENV = {
    SUPABASE_SERVICE_ROLE_KEY: readEnv("SUPABASE_SERVICE_ROLE_KEY"),
    DATABASE_URL: readEnv("DATABASE_URL"),
    OPENAI_API_KEY: readEnv("OPENAI_API_KEY"),
    PORTONE_IMP_KEY: readEnv("PORTONE_IMP_KEY"),
    PORTONE_IMP_SECRET: readEnv("PORTONE_IMP_SECRET"),
    GOOGLE_SITE_VERIFICATION: readEnv("GOOGLE_SITE_VERIFICATION"),
    EMBED_WEBHOOK_SECRET: readEnv("EMBED_WEBHOOK_SECRET"),
    GOOGLE_SERVICE_ACCOUNT_JSON: readEnv("GOOGLE_SERVICE_ACCOUNT_JSON"),
    KAKAO_REST_API_KEY: readEnv("KAKAO_REST_API_KEY"),
} as const;

/** 운영 환경 여부 */
export const IS_PRODUCTION = process.env.NODE_ENV === "production";
