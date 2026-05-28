// 광고 관련 상수 — server / client 양쪽에서 import 가능 (next/headers 의존성 없음)
// 분리 이유: ad-queries.ts 는 server.ts 를 import 하므로 client component 에서 사용 불가.

/** merchant_uid prefix — 관리자 무료 부여 식별용 (목록 조회 시 LIKE 필터) */
export const ADMIN_GRANT_PREFIX = "ADMIN_GRANT-";

/** 부여 가능 기간 옵션 — API + UI 공통 */
export const VALID_GRANT_MONTHS = [1, 2, 3, 6, 12] as const;

/** Set 형태 (route 검증용) — VALID_GRANT_MONTHS 와 동기화 */
export const VALID_GRANT_MONTHS_SET = new Set<number>(VALID_GRANT_MONTHS);

/** listAdminGrants pageSize 상한 */
export const MAX_PAGE_SIZE = 100;

/** ad_plans.max_portfolios 가 null 일 때 기본값 (slot 갯수 cap) */
export const DEFAULT_MAX_PORTFOLIOS = 3;

/** 검색이 너무 광범위할 때 in() 절이 거대해지지 않도록 매칭 아티스트 ID 갯수 cap */
export const MAX_ARTIST_SEARCH_FILTER_IDS = 200;

/** NewGrantModal 검색 최소 글자 — 1자 트리거 시 매 입력마다 fetch 폭주 방지 */
export const MIN_SEARCH_LENGTH = 2;

/** 검색 디바운스 — 한글 IME compose 고려 */
export const SEARCH_DEBOUNCE_MS = 300;

/** 아티스트 자동완성 결과 개수 */
export const ARTIST_SEARCH_RESULT_LIMIT = 10;

/** ad-grants 페이지 기본 페이지 사이즈 */
export const GRANTS_PAGE_SIZE = 20;
