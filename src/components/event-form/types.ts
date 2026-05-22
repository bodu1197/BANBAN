export const EVENT_CATEGORIES = [
  "눈썹",
  "입술",
  "두피",
  "네일",
  "속눈썹",
  "헤어라인",
  "기타",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const RETOUCH_TYPES = [
  { value: "included", label: "리터치 포함" },
  { value: "separate", label: "리터치 별도" },
  { value: "none", label: "추가비 없음" },
  { value: "extra", label: "추가비 있음" },
] as const;

export type RetouchType = (typeof RETOUCH_TYPES)[number]["value"];

export const TARGET_AUDIENCE_OPTIONS = [
  "처음 시술받는 분",
  "자연스러운 스타일을 원하는 분",
  "또렷한 인상을 원하는 분",
  "기존 시술이 흐려진 분",
  "관리 시간을 줄이고 싶은 분",
  "특별한 날을 앞둔 분",
  "이미지 변화를 원하는 분",
] as const;

export interface EventFormValues {
  // Step 1: Basic
  category: EventCategory | "";
  procedureName: string;
  title: string;
  priceOrigin: string;
  price: string;
  retouchType: RetouchType;
  retouchDescription: string;

  // Step 2: Details
  eventPeriodText: string;
  eventStartAt: string;
  eventEndAt: string;
  procedureSummary: string;
  targetAudience: string[];
  customTarget: string;
  shopName: string;
  shopRegion: string;
  shopBusinessHours: string;
  shopParking: string;
  shopBookingMethod: string;

  // Step 2: Optional
  procedureDuration: string;
  maintenancePeriod: string;
  procedureAdvantages: [string, string, string];
  precautions: string;
  artistIntroduction: string;
}

export interface EventMediaSlot {
  file: File | null;
  preview: string;
  type: "hero" | "before_after" | "shop";
  label: string;
}

export interface GeneratedEventContent {
  headline: string;
  subheadline: string;
  sections: Array<{
    heading: string;
    body: string;
  }>;
  targetAudienceExpanded: Array<{
    label: string;
    description: string;
  }>;
  faq: Array<{
    question: string;
    answer: string;
  }>;
  callToAction: string;
  seoDescription: string;
}

// --- Detail Image-based Page Types ---

export const DETAIL_SECTION_TYPES = [
  "detail_hero",
  "detail_intro",
  "detail_before_after",
  "detail_audience",
  "detail_process",
  "detail_shop",
  "detail_cta",
] as const;

export type DetailSectionType = (typeof DETAIL_SECTION_TYPES)[number];

export const DETAIL_SECTION_LABELS: Record<DetailSectionType, string> = {
  detail_hero: "히어로 배너",
  detail_intro: "시술 소개",
  detail_before_after: "시술 전후",
  detail_audience: "추천 대상",
  detail_process: "시술 과정",
  detail_shop: "샵 정보",
  detail_cta: "예약 안내",
};

export const EDIT_SECTIONS: DetailSectionType[] = [
  "detail_hero",
  "detail_before_after",
  "detail_shop",
];

export interface DetailSectionCopy {
  detail_hero: { headline: string; subtext: string; colorTheme: string };
  detail_intro: { heading: string; benefits: string[]; bodyText: string };
  detail_before_after: { heading: string; caption: string };
  detail_audience: { heading: string; items: Array<{ emoji: string; text: string }> };
  detail_process: { heading: string; steps: string[]; precautions: string[] };
  detail_shop: { heading: string; details: string[] };
  detail_cta: { heading: string; urgencyText: string; ctaButton: string };
}

export interface GeneratedDetailCopy {
  sections: DetailSectionCopy;
  seoDescription: string;
  altTexts: Record<DetailSectionType, string>;
}

export interface DetailSectionResult {
  sectionType: DetailSectionType;
  storagePath: string;
  b64Preview: string;
  altText: string;
  status: "pending" | "generating" | "completed" | "failed";
  error?: string;
}

export const INITIAL_FORM_VALUES: EventFormValues = {
  category: "",
  procedureName: "",
  title: "",
  priceOrigin: "",
  price: "",
  retouchType: "included",
  retouchDescription: "",
  eventPeriodText: "",
  eventStartAt: "",
  eventEndAt: "",
  procedureSummary: "",
  targetAudience: [],
  customTarget: "",
  shopName: "",
  shopRegion: "",
  shopBusinessHours: "",
  shopParking: "",
  shopBookingMethod: "",
  procedureDuration: "",
  maintenancePeriod: "",
  procedureAdvantages: ["", "", ""],
  precautions: "",
  artistIntroduction: "",
};
