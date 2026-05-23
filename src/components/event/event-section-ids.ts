export const EVENT_SECTION_IDS = {
  description: "event-section-desc",
  reviews: "event-section-reviews",
  shop: "event-section-shop",
} as const;

export type EventSectionId = (typeof EVENT_SECTION_IDS)[keyof typeof EVENT_SECTION_IDS];
