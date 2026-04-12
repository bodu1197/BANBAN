/**
 * Shared region grouping utilities.
 * Used by RegionModal, RegionSelector, RegionPickerModal, and portfolio search.
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

export interface RegionGroup {
  prefix: string;
  name: string;
  subRegions: Array<{ id: string; name: string }>;
}

/**
 * Group flat region list into sido-prefixed groups.
 * Sub-region names have the sido prefix stripped for display.
 */
export function groupRegionsByPrefix(
  regions: ReadonlyArray<{ id: string; name: string }>,
): RegionGroup[] {
  return REGION_PREFIXES.map(({ prefix, name }) => ({
    prefix,
    name,
    subRegions: regions
      .filter((r) => r.name.startsWith(prefix))
      .map((r) => ({
        id: r.id,
        name: r.name.replace(`${prefix} `, ""),
      })),
  }));
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
 * Convert an address to a region search keyword.
 * Supports both full names ("서울특별시 강남구 ...") and
 * short names already in DB ("서울 강남구 ...").
 */
export function addressToRegionKey(address: string): string | null {
  const parts = address.split(" ");
  if (parts.length < 2) return null;

  // Try full sido name first (Daum Postcode), then short name (DB stored)
  const sido = ADDRESS_SIDO_MAP[parts[0]] ?? (SHORT_SIDO_SET.has(parts[0]) ? parts[0] : null);
  if (!sido) return null;

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
