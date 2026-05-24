/**
 * Event 도메인 타입. Client / API route 양쪽에서 공유한다.
 * 이전: components/event-form/types.ts (API route 가 components 를 import 하는 레이어 위반)
 */

import type { EventCategory, RetouchType, DetailSectionType } from "./constants";

export interface EventFormValues {
    category: EventCategory | "";
    procedureName: string;
    title: string;
    priceOrigin: string;
    price: string;
    retouchType: RetouchType;
    retouchDescription: string;
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
    thumbnailPath?: string;
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
