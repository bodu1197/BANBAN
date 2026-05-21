import type { ArtistType } from "./database";

export interface ArtistFormCategory {
  id: string;
  name: string;
  category_type: string | null;
}

export interface DayHours {
  open: string;
  close: string;
}

export type BusinessHoursMap = Record<string, DayHours | null>;

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const DEFAULT_OPEN_TIME = "10:00";
export const DEFAULT_CLOSE_TIME = "19:00";

export const DEFAULT_BUSINESS_HOURS: BusinessHoursMap = {
  mon: { open: DEFAULT_OPEN_TIME, close: DEFAULT_CLOSE_TIME },
  tue: { open: DEFAULT_OPEN_TIME, close: DEFAULT_CLOSE_TIME },
  wed: { open: DEFAULT_OPEN_TIME, close: DEFAULT_CLOSE_TIME },
  thu: { open: DEFAULT_OPEN_TIME, close: DEFAULT_CLOSE_TIME },
  fri: { open: DEFAULT_OPEN_TIME, close: DEFAULT_CLOSE_TIME },
  sat: { open: DEFAULT_OPEN_TIME, close: DEFAULT_CLOSE_TIME },
  sun: null,
};

const TIME_RE = /^\d{2}:\d{2}$/;

export function isDayHours(v: unknown): v is DayHours {
  if (typeof v !== "object" || v === null) return false;
  const { open, close } = v as Record<string, unknown>;
  return typeof open === "string" && typeof close === "string" && TIME_RE.test(open) && TIME_RE.test(close);
}

export function parseBusinessHours(raw: unknown): BusinessHoursMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return DEFAULT_BUSINESS_HOURS;
  const src = raw as Record<string, unknown>;
  const result: BusinessHoursMap = {};
  for (const key of DAY_KEYS) {
    // eslint-disable-next-line security/detect-object-injection -- iterating known constant keys
    const val = src[key];
    // eslint-disable-next-line security/detect-object-injection -- iterating known constant keys
    result[key] = isDayHours(val) ? val : null;
  }
  return result;
}

export interface ArtistFormData {
  type_artist: ArtistType;
  title: string;
  contact: string;
  instagram_url: string;
  kakao_url: string;
  zipcode: string;
  address: string;
  address_detail: string;
  region_id: string;
  introduce: string;
  description: string;
  shop_category_ids: string[];
  bank_holder: string;
  bank_name: string;
  bank_account: string;
  business_hours: BusinessHoursMap;
}

export const INITIAL_FORM_DATA: ArtistFormData = {
  type_artist: "SEMI_PERMANENT",
  title: "",
  contact: "",
  instagram_url: "",
  kakao_url: "",
  zipcode: "",
  address: "",
  address_detail: "",
  region_id: "",
  introduce: "",
  description: "",
  shop_category_ids: [],
  bank_holder: "",
  bank_name: "",
  bank_account: "",
  business_hours: DEFAULT_BUSINESS_HOURS,
};

export const BANK_OPTIONS = [
  "KB국민은행",
  "신한은행",
  "하나은행",
  "우리은행",
  "NH농협은행",
  "IBK기업은행",
  "SC제일은행",
  "씨티은행",
  "KDB산업은행",
  "케이뱅크",
  "카카오뱅크",
  "토스뱅크",
  "새마을금고",
  "신협",
  "우체국",
  "수협은행",
  "부산은행",
  "경남은행",
  "대구은행",
  "광주은행",
  "전북은행",
  "제주은행",
];

export async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=kr&limit=1`,
      { headers: { "User-Agent": "Banunni/1.0 (howtattoo@banunni.com)" } },
    );
    const data = await response.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
  } catch { /* Continue without coordinates */ }
  return null;
}
