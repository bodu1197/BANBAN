// 클라이언트/서버 공용 순수 모듈 (서버 전용 import 금지 — 클라이언트 번들에도 포함됨)

export type SimArea = "eyebrow" | "lip";

/** 영역(눈썹/입술)별 1일 시뮬레이션 허용 횟수 — 단일 진실 소스 */
export const SIM_AREA_LIMIT = 2;

/** 비로그인 사용자 식별 쿠키 이름 */
export const SIM_ANON_COOKIE = "bsim_anon";

export interface Quotas {
  eyebrow: number;
  lip: number;
}

export const DEFAULT_QUOTAS: Quotas = { eyebrow: SIM_AREA_LIMIT, lip: SIM_AREA_LIMIT };

const VALID_AREAS = new Set<string>(["eyebrow", "lip"]);

export function parseSimArea(value: unknown): SimArea | null {
  return typeof value === "string" && VALID_AREAS.has(value) ? (value as SimArea) : null;
}

export function areaLabel(area: SimArea): string {
  return area === "eyebrow" ? "눈썹" : "입술";
}

export function otherArea(area: SimArea): SimArea {
  return area === "eyebrow" ? "lip" : "eyebrow";
}

/** Quotas 객체에서 영역별 잔여를 동적 키 없이 읽는다(object-injection 회피). */
export function remainingFor(quotas: Quotas, area: SimArea): number {
  return area === "eyebrow" ? quotas.eyebrow : quotas.lip;
}

/** 영역별 잔여를 동적 키 없이 갱신한 새 Quotas 를 반환한다. */
export function withRemaining(quotas: Quotas, area: SimArea, remaining: number): Quotas {
  return area === "eyebrow"
    ? { ...quotas, eyebrow: remaining }
    : { ...quotas, lip: remaining };
}
