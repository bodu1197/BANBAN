/**
 * Curated list of styles used for location × style SEO landing pages.
 * We don't iterate over every category — only those with strong search intent.
 */
export const LOCATION_SEO_STYLES = [
  "블랙앤그레이",
  "라인워크",
  "리얼리스틱",
  "감성타투",
  "미니타투",
  "레터링",
  "수채화",
  "이레즈미",
  "올드스쿨",
  "뉴스쿨",
  "치카노",
  "커버업",
] as const;

export type LocationSeoStyle = (typeof LOCATION_SEO_STYLES)[number];
