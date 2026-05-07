/**
 * Curated list of styles used for location × style SEO landing pages.
 * We don't iterate over every category — only those with strong search intent.
 */
export const LOCATION_SEO_STYLES = [
  "눈썹반영구",
  "아이라인",
  "입술반영구",
  "헤어라인",
  "SMP",
  "속눈썹",
  "콤보눈썹",
  "파우더눈썹",
  "엠보눈썹",
  "남자눈썹",
  "풀립",
  "점제거",
] as const;

export type LocationSeoStyle = (typeof LOCATION_SEO_STYLES)[number];
