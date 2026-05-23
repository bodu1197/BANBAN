/**
 * Event 도메인 상수. Client / API route 양쪽에서 공유한다.
 * 이전: components/event-form/types.ts (API route 가 components 를 import 하는 레이어 위반)
 */

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

export const EVENT_FIELD_LIMITS = {
    procedure_name: 100,
    title: 200,
    procedure_summary: 100,
    event_period_text: 200,
    retouch_type: 50,
    retouch_description: 500,
    shop_name: 100,
    shop_region: 100,
    shop_business_hours: 100,
    shop_parking: 50,
    shop_booking_method: 100,
    procedure_duration: 50,
    maintenance_period: 50,
    precautions: 2000,
    artist_introduction: 2000,
    target_audience_item: 50,
    procedure_advantages_item: 200,
} as const;

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

export const TARGET_AUDIENCE_OPTIONS = [
    "처음 시술받는 분",
    "자연스러운 스타일을 원하는 분",
    "또렷한 인상을 원하는 분",
    "기존 시술이 흐려진 분",
    "관리 시간을 줄이고 싶은 분",
    "특별한 날을 앞둔 분",
    "이미지 변화를 원하는 분",
] as const;
