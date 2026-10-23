/**
 * Shared region utilities.
 * Used by RegionModal, RegionSelector, and 주소→지역 매칭(regions-lookup).
 */

export const REGION_PREFIXES = [
  { prefix: "서울", name: "서울" },
  { prefix: "경기", name: "경기" },
  { prefix: "인천", name: "인천" },
  { prefix: "대전", name: "대전" },
  { prefix: "세종", name: "세종" },
  { prefix: "충남", name: "충남" },
  { prefix: "충북", name: "충북" },
  { prefix: "강원", name: "강원" },
  { prefix: "부산", name: "부산" },
  { prefix: "대구", name: "대구" },
  { prefix: "울산", name: "울산" },
  { prefix: "경남", name: "경남" },
  { prefix: "경북", name: "경북" },
  { prefix: "광주", name: "광주" },
  { prefix: "전남", name: "전남" },
  { prefix: "전북", name: "전북" },
  { prefix: "제주", name: "제주" },
] as const;

export function getSidoDisplayName(sido: string): string {
  return sido;
}

/**
 * Extract the sido (province) prefix from a full region name.
 * e.g., "서울 강남구" → "서울"
 */
export function extractSido(regionName: string): string {
  return regionName.split(" ")[0];
}

/**
 * Map Daum Postcode full sido names to our short region prefixes.
 * e.g., "서울특별시" → "서울", "경기도" → "경기"
 * DB 트리거 artists_region_from_address 의 시도 CASE 와 같은 표 — 바꿀 땐 둘 다. 적용된 마이그레이션은 고치지 않고
 * 새 마이그레이션에서 함수 전체를 다시 정의한다(최신 정의는 supabase/migrations 를 함수 이름으로 검색).
 */
const ADDRESS_SIDO_MAP: Record<string, string> = {
  "서울특별시": "서울",
  "부산광역시": "부산",
  "대구광역시": "대구",
  "인천광역시": "인천",
  "광주광역시": "광주",
  "대전광역시": "대전",
  "울산광역시": "울산",
  "세종특별자치시": "세종",
  "경기도": "경기",
  "강원특별자치도": "강원",
  "강원도": "강원",
  "충청북도": "충북",
  "충청남도": "충남",
  "전북특별자치도": "전북",
  "전라북도": "전북",
  "전라남도": "전남",
  "경상북도": "경북",
  "경상남도": "경남",
  "제주특별자치도": "제주",
};

/** Short sido prefixes that already match region names directly */
const SHORT_SIDO_SET = new Set<string>(REGION_PREFIXES.map((r) => r.prefix));

/**
 * 2026-07-01 광주광역시+전라남도 → 전남광주통합특별시. 다음 주소검색이 이 이름을 그대로 내려준다.
 * regions 는 광주/전남 그대로 두고(지역 필터·페이지 유지) 옛 광주 5개 구는 '광주', 나머지 시·군은 '전남'으로 붙인다.
 * DB 트리거는 이 목록 없이 '광주 X'/'전남 X' 중 regions 에 있는 쪽을 고른다 — 이 목록이 틀려도
 * 저장값은 안 깨지고 폼이 "지역을 찾지 못했습니다"로 드러낸다.
 */
const GWANGJU_DISTRICTS = new Set(["동구", "서구", "남구", "북구", "광산구"]);

/** 통합시 이름만 옛 시도 약칭('광주'/'전남')으로 되돌린다. 그 밖의 시도 표기는 그대로 돌려준다. */
function unmergeSido(sido: string, sigungu: string): string {
  if (sido !== "전남광주통합특별시") return sido;
  return GWANGJU_DISTRICTS.has(sigungu) ? "광주" : "전남";
}

/**
 * Convert an address to a region search keyword.
 * Supports both full names ("서울특별시 강남구 ...") and
 * short names already in DB ("서울 강남구 ...").
 * DB 트리거 artists_region_from_address 와 같은 규칙(시도 표·세종 고정·시+구·통합시) — 바꿀 땐 둘 다.
 */
export function addressToRegionKey(address: string): string | null {
  const parts = address.trim().split(/\s+/);
  if (parts.length < 2) return null;
  parts[0] = unmergeSido(parts[0], parts[1]);

  // Try full sido name first (Daum Postcode), then short name (DB stored)
  const sido = ADDRESS_SIDO_MAP[parts[0]] ?? (SHORT_SIDO_SET.has(parts[0]) ? parts[0] : null);
  if (!sido) return null;

  // 세종은 시군구가 없어 주소 2번째 토큰이 도로명이다 → 유일한 지역으로 고정.
  if (sido === "세종") return "세종 세종시";

  // For cities with sub-districts (e.g., "수원시 팔달구"), include both
  const district = parts[1];
  if (parts.length > 2 && district.endsWith("시") && parts[2].endsWith("구")) {
    return `${sido} ${district} ${parts[2]}`;
  }

  return `${sido} ${district}`;
}

function stripSidoPrefix(regionName: string): string {
  const parts = regionName.split(" ");
  return parts.length > 1 ? parts.slice(1).join(" ") : regionName;
}

export function getRegionDisplayName(
  region: { name: string },
): string {
  return region.name;
}

export function getSubRegionDisplayName(
  region: { name: string },
): string {
  return stripSidoPrefix(region.name);
}
