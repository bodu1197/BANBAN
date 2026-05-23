/**
 * Supabase 환경변수 중앙화.
 * 모든 모듈은 `process.env.NEXT_PUBLIC_SUPABASE_*` 를 직접 읽지 않고 여기서 import 한다.
 * - 중복 정의 제거 (이전: 15개 파일에 산재)
 * - 빌드 타임 / 런타임 일관성 보장
 */

export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
