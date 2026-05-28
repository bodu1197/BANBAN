// 광고 관련 상수 — server / client 양쪽에서 import 가능 (next/headers 의존성 없음)
// 분리 이유: ad-queries.ts 는 server.ts 를 import 하므로 client component 에서 사용 불가.

/** merchant_uid prefix — 관리자 무료 부여 식별용 (목록 조회 시 LIKE 필터) */
export const ADMIN_GRANT_PREFIX = "ADMIN_GRANT-";

/** 부여 가능 기간 옵션 — API + UI 공통 */
export const VALID_GRANT_MONTHS = [1, 2, 3, 6, 12] as const;

/** listAdminGrants pageSize 상한 */
export const MAX_PAGE_SIZE = 100;

/** ad_plans.max_portfolios 가 null 일 때 기본값 (slot 갯수 cap) */
export const DEFAULT_MAX_PORTFOLIOS = 3;
