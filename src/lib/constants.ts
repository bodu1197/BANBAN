/**
 * Application constants
 */

// Pagination
export const PAGE_SIZE = 24;
export const INFINITE_SCROLL_THRESHOLD = 0.8;

// Region codes
export const REGIONS = [
  "seoul", "gyeonggi", "incheon", "daejeon", "sejong",
  "chungnam", "chungbuk", "gangwon", "busan", "daegu",
  "ulsan", "gyeongnam", "gyeongbuk", "gwangju",
  "jeonnam", "jeonbuk", "jeju",
] as const;

export type Region = (typeof REGIONS)[number];

// Genre codes
export const GENRES = [
  "blackAndGray", "watercolor", "lettering", "oriental",
  "newSchool", "oldSchool", "realistic", "tribal",
  "geometric", "minimalist", "coverUp", "dotwork",
] as const;

export type Genre = (typeof GENRES)[number];

// Body parts
export const BODY_PARTS = [
  "arm", "leg", "back", "chest", "hand", "foot",
  "neck", "head", "shoulder", "waist", "finger", "wrist",
] as const;

export type BodyPart = (typeof BODY_PARTS)[number];

// Breakpoints (match Tailwind defaults)
export const BREAKPOINTS = {
  sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536,
} as const;
