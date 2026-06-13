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
  introduce_qa: IntroduceQA | null;
  description: string;
  shop_category_ids: string[];
  bank_holder: string;
  bank_name: string;
  bank_account: string;
  business_hours: BusinessHoursMap;
}

/** 인터뷰 Q&A 1건 (q = 답변 당시 질문 라벨 — 질문 문구가 바뀌어도 보존). */
export interface IntroduceQAItem {
  id: string;
  q: string;
  a: string;
}

/** 구조화 소개글 = 인터뷰 답변(qa) + 자유작성(free). artists.introduce_qa(jsonb) 에 저장. */
export interface IntroduceQA {
  qa: IntroduceQAItem[];
  free: string;
}

/** 구조화 Q&A → 평문 introduce 파생 (답변 + 자유작성 join). SEO meta/JSON-LD/카드 fallback 용. */
export function deriveIntroduceText(data: IntroduceQA): string {
  const parts = data.qa.map((item) => item.a.trim()).filter(Boolean);
  const free = data.free.trim();
  if (free) parts.push(free);
  return parts.join("\n");
}

// jsonb 비대화/어뷰징 방지 캡 (서버 parseIntroduceQA 에서 강제 — 클라 우회 차단).
const MAX_QA_ID_LEN = 50;
const MAX_QA_Q_LEN = 200;
const MAX_QA_A_LEN = 2000;
const MAX_QA_FREE_LEN = 5000;
const MAX_QA_ITEMS = 20;

function parseQAItem(item: unknown): IntroduceQAItem | null {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const it = item as Record<string, unknown>;
  if (typeof it.id === "string" && typeof it.q === "string" && typeof it.a === "string") {
    return { id: it.id.slice(0, MAX_QA_ID_LEN), q: it.q.slice(0, MAX_QA_Q_LEN), a: it.a.slice(0, MAX_QA_A_LEN) };
  }
  return null;
}

function parseQAArray(raw: unknown): IntroduceQAItem[] {
  const qa: IntroduceQAItem[] = [];
  if (!Array.isArray(raw)) return qa;
  for (const item of raw) {
    if (qa.length >= MAX_QA_ITEMS) break;
    const parsed = parseQAItem(item);
    if (parsed) qa.push(parsed);
  }
  return qa;
}

/** 저장된 introduce_qa(jsonb, unknown) → IntroduceQA. 형식 불일치/레거시(null)면 null. 길이/개수 캡 적용. */
export function parseIntroduceQA(raw: unknown): IntroduceQA | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const free = (typeof obj.free === "string" ? obj.free : "").slice(0, MAX_QA_FREE_LEN);
  const qa = parseQAArray(obj.qa);
  if (qa.length === 0 && !free) return null;
  return { qa, free };
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
  introduce_qa: null,
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

// /api/geocode 응답 계약 — 클라(geocodeAddress)와 서버 라우트가 공유해 drift 를 막는다.
export interface GeocodeResult {
  lat: number | null;
  lon: number | null;
}

// 동일 출처 서버 프록시(/api/geocode) 경유 — 클라에서 외부 지오코더(카카오 등) 직접 호출은 CSP(connect-src)에 막힌다.
// 클라이언트에서만 호출(register/edit 폼). 서버 호출용 아님(상대경로라 서버에서 쓰면 안 됨).
export async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const response = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
    if (!response.ok) return null;
    const data = await response.json() as GeocodeResult;
    if (data.lat !== null && data.lon !== null) {
      return { lat: data.lat, lon: data.lon };
    }
  } catch { /* Continue without coordinates */ }
  return null;
}
