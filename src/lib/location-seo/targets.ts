export interface LocationTarget {
  region: string; // regions.name 와 정확히 일치, 예: "서울 강남구"
  style: string; // 시술명, 예: "눈썹"
}

// 점진 생성 초기 범위 — 주요 서울 지역 × 핵심 3시술. 확장 시 이 배열만 늘리면 됨.
const SEOUL_MAJOR_REGIONS = [
  "서울 강남구",
  "서울 서초구",
  "서울 송파구",
  "서울 마포구",
  "서울 용산구",
  "서울 영등포구",
  "서울 강서구",
  "서울 종로구",
] as const;

const CORE_STYLES = ["눈썹", "입술", "아이라인"] as const;

export const LOCATION_TARGETS: LocationTarget[] = SEOUL_MAJOR_REGIONS.flatMap((region) =>
  CORE_STYLES.map((style) => ({ region, style })),
);

/** 발행 여부 판별 키 — region_name|style (테이블에 region_name denormalize 되어 있어 region_id 해석 불필요). */
export function targetKey(region: string, style: string): string {
  return `${region}|${style}`;
}
