/**
 * Supabase / PostgREST 쿼리 utility — client/server 양쪽 안전.
 * Why 분리: ad-queries 는 server-only(next/headers), 이 모듈은 pure function 만 포함.
 */

/**
 * PostgreSQL LIKE/ILIKE 의 wildcard 메타문자 (% _ \) 를 이스케이프.
 * 의도한 부분 매칭만 허용 — 사용자 입력의 `%` 가 catch-all 로 동작하는 것 차단.
 *
 * @example
 *   ilike("title", `%${escapeLikePattern("100%")}%`) // 'title' LIKE '%100\%%'
 */
export function escapeLikePattern(s: string): string {
  return s.replace(/[\\%_]/g, "\\$&");
}
