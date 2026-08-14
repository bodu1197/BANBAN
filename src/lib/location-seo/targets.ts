export interface LocationTarget {
  region: string; // regions.name 와 정확히 일치, 예: "서울 강남구"
  style: string; // 시술명, 예: "눈썹"
}

/**
 * 지역 랜딩이 노리는 시술. "강남 눈썹문신" 처럼 (지역 + 시술) 조합이 실제 검색어 형태다.
 */
export const CORE_STYLES = ["눈썹", "입술", "아이라인"] as const;

/**
 * ⚠️ 대상 지역은 **DB에서 뽑는다**(fetchRegionNamesWithActiveShops). 하드코딩하지 말 것.
 *
 * 예전에는 여기에 서울 8개 구를 상수로 박아 24개 조합만 만들었다. 그 24개를 다 쓴 뒤
 * 크론은 매일 돌면서 0개를 만들었고(그중 종로구 3개는 '샵 0곳' 으로 영구 실패),
 * 2026-06-16 이후 59일간 신규 지역 페이지가 0개였다. 샵이 새로 등록된 지역은
 * 배열을 사람이 고쳐줄 때까지 영원히 페이지를 못 받는 구조였다.
 * 이제 샵이 1곳 이상인 지역이 생기면 자동으로 대상에 들어온다.
 */
export function buildLocationTargets(regionNames: readonly string[]): LocationTarget[] {
  return regionNames.flatMap((region) => CORE_STYLES.map((style) => ({ region, style })));
}

/** 발행 여부 판별 키 — region_name|style (테이블에 region_name denormalize 되어 있어 region_id 해석 불필요). */
export function targetKey(region: string, style: string): string {
  return `${region}|${style}`;
}
