import type { Metadata } from "next";
import type { BusinessHoursMap } from "@/types/artist-form";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://banunni.com")
  .trim()
  .replace(/\/+$/, "");
const SITE_NAME = "반언니";
const SCHEMA_CONTEXT = "https://schema.org";
const DEFAULT_OG_IMAGE = "/og-image.png";

/**
 * Get canonical URL for a given path
 */
export function getCanonicalUrl(path: string = ""): string {
  const normalized = path.startsWith("/") || path === "" ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

/**
 * Generate alternates metadata (canonical only — Korean-only site).
 * Use in generateMetadata: `alternates: getAlternates("/about")`
 */
export function getAlternates(path: string = ""): { canonical: string } {
  return { canonical: getCanonicalUrl(path) };
}

/**
 * 공백/빈 문자열 description 을 fallback 으로 치환(SEO meta·JSON-LD description 공용 가드).
 * 이 모듈의 buildPageSeo / getXJsonLd 빌더들이 쓰는 description 을 채우는 호출부 가드라 seo.ts 에 둔다.
 * `value` 가 trim 후 비어 있으면 fallback, 아니면 trim 한 값을 `max`(양수) 길이로 캡(미지정 시 원본).
 * `x || fallback`(공백 문자열=truthy 누수)·`x ?? fallback`(빈 문자열 누수) 가드의 함정을 한 곳에서 차단한다.
 */
/**
 * 이름 있는 HTML 엔티티 최소 집합 — 본문에서 실제로 나오는 것만. 숫자 엔티티는 별도 처리.
 * Map 을 쓰는 이유: 평범한 객체면 `&constructor;` 같은 입력이 프로토타입 체인을 타
 * `function Object() { [native code] }` 가 meta description 에 그대로 실린다.
 */
const NAMED_ENTITIES = new Map<string, string>([
  ["nbsp", " "], ["amp", "&"], ["lt", "<"], ["gt", ">"], ["quot", '"'], ["apos", "'"],
]);

/**
 * 정규식 스캔 상한. `introduce`·`description` 에 길이 제약이 없어 태그 정리 정규식이
 * 아주 긴 입력에서 O(n²) 로 늘어질 수 있다(닫는 `>` 가 없는 `<p ` 반복 등).
 * meta description 은 어차피 160자만 쓰므로 앞부분만 훑으면 충분하다.
 */
const PLAIN_TEXT_SCAN_LIMIT = 20_000;

/** 유효한 유니코드 스칼라만 복원 — 범위를 벗어나면 String.fromCodePoint 가 RangeError 로 페이지를 500 낸다. */
function decodeCodePoint(code: number, original: string): string {
  if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) return original;
  if (code >= 0xd800 && code <= 0xdfff) return original; // surrogate half
  return String.fromCodePoint(code);
}

/**
 * 에디터 원문(HTML)을 meta description / JSON-LD 에 쓸 수 있는 순수 텍스트로 바꾼다.
 *
 * 레거시 이관 작품 161개(공개 627개 중 25.7%)의 description 이
 * `<p><img alt="3190811017403568772_1494000330.jpg" src="/files/…">` 형태라
 * 검색 스니펫과 카카오톡/페이스북 공유 미리보기에 태그가 그대로 노출되고 있었다(2026-08-14 실측).
 * 태그를 지운 뒤 읽을 텍스트가 남지 않으면 빈 문자열을 돌려주고, 호출부가 fallback 을 쓴다.
 *
 * ⚠️ 반환값을 dangerouslySetInnerHTML 로 넘기지 마라. 엔티티를 디코딩하므로 DB 에 `&lt;script&gt;`
 * 가 들어 있으면 결과 문자열에는 진짜 `<script>` 가 복원된다. 용도는 meta/JSON-LD 같은
 * **텍스트 sink 전용**이다(Next metadata 는 자동 escape, JSON-LD 는 jsonLdSafe 가 `<` 를 이스케이프).
 */
export function htmlToPlainText(value: string): string {
  return value
    .slice(0, PLAIN_TEXT_SCAN_LIMIT)
    // script/style 은 태그를 벗기면 코드가 본문으로 새므로 통째로 제거
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    // 블록 경계는 공백으로 — 문장이 붙어버리는 것 방지
    .replace(/<\/?(p|div|br|li|tr|h[1-6]|section|article)\b[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&#(\d+);/g, (whole, code: string) => decodeCodePoint(Number(code), whole))
    .replace(/&#x([0-9a-f]+);/gi, (whole, code: string) => decodeCodePoint(Number.parseInt(code, 16), whole))
    .replace(/&([a-z]+);/gi, (whole, name: string) => NAMED_ENTITIES.get(name.toLowerCase()) ?? whole)
    .replace(/\s+/g, " ")
    .trim();
}

export function descriptionOrFallback(
  value: string | null | undefined,
  fallback: string,
  max?: number,
): string {
  const trimmed = value ? htmlToPlainText(value) : "";
  if (!trimmed) return fallback;
  return max === undefined ? trimmed : trimmed.slice(0, max);
}

/**
 * JSON-LD 빌더 공용: 빈/공백 description 을 출력에서 생략한다(빈 description 프로퍼티 = 무효 구조화 데이터).
 * 호출부 descriptionOrFallback 가드의 2차 방어선 — 빌더 자체가 절대 빈 description 을 내보내지 않게 보장.
 */
function applyDescription(jsonLd: Record<string, unknown>, description: string): void {
  const trimmed = description.trim();
  if (trimmed) jsonLd.description = trimmed;
}

/**
 * Generate JSON-LD WebSite schema
 */
export function getWebsiteJsonLd(): Record<string, unknown> {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

interface ArtistJsonLdInput {
  name: string;
  description: string;
  address: string;
  image?: string | null;
  url: string;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number;
  reviewCount?: number;
  offers?: ReadonlyArray<{ name: string; price: number }>;
  openingHours?: BusinessHoursMap;
}

function buildGeoJsonLd(artist: Readonly<ArtistJsonLdInput>): Record<string, unknown> | undefined {
  if (isDefined(artist.latitude) && isDefined(artist.longitude)) {
    return {
      "@type": "GeoCoordinates",
      latitude: artist.latitude,
      longitude: artist.longitude,
    };
  }
  return undefined;
}

function buildAggregateRatingJsonLd(artist: Readonly<ArtistJsonLdInput>): Record<string, unknown> | undefined {
  if (isDefined(artist.rating) && isDefined(artist.reviewCount) && artist.reviewCount > 0) {
    return {
      "@type": "AggregateRating",
      ratingValue: artist.rating,
      reviewCount: artist.reviewCount,
    };
  }
  return undefined;
}

/** 요일 키(mon~sun) → schema.org dayOfWeek. */
const DAY_OF_WEEK_SCHEMA: Record<string, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday",
};

function buildOpeningHoursJsonLd(hours?: BusinessHoursMap): Array<Record<string, unknown>> | undefined {
  if (!hours) return undefined;
  const spec: Array<Record<string, unknown>> = [];
  for (const [day, dayName] of Object.entries(DAY_OF_WEEK_SCHEMA)) {
    // eslint-disable-next-line security/detect-object-injection -- day 는 DAY_OF_WEEK_SCHEMA 상수 키
    const h = hours[day];
    if (h) {
      spec.push({
        "@type": "OpeningHoursSpecification",
        // schema.org enum 정식 IRI — Google 은 URL-prefix/short name 둘 다 지원(공식문서 확인). availability/eventStatus 와 형식 통일.
        dayOfWeek: `https://schema.org/${dayName}`,
        opens: h.open,
        closes: h.close,
      });
    }
  }
  return spec.length > 0 ? spec : undefined;
}

function buildMakesOfferJsonLd(
  offers?: ReadonlyArray<{ name: string; price: number }>,
): Array<Record<string, unknown>> | undefined {
  if (!offers || offers.length === 0) return undefined;
  return offers.map((o) => ({
    "@type": "Offer",
    name: o.name,
    price: o.price,
    priceCurrency: "KRW",
    availability: "https://schema.org/InStock",
  }));
}

/**
 * Generate JSON-LD for an artist (LocalBusiness schema)
 */
export function getArtistJsonLd(artist: Readonly<ArtistJsonLdInput>): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    "@context": SCHEMA_CONTEXT,
    "@type": "LocalBusiness",
    "@id": artist.url,
    name: artist.name,
    url: artist.url,
    address: {
      "@type": "PostalAddress",
      streetAddress: artist.address,
      addressCountry: "KR",
    },
  };

  applyDescription(jsonLd, artist.description);

  if (artist.image) {
    jsonLd.image = artist.image;
  }

  const geo = buildGeoJsonLd(artist);
  if (geo) {
    jsonLd.geo = geo;
  }

  const aggregateRating = buildAggregateRatingJsonLd(artist);
  if (aggregateRating) {
    jsonLd.aggregateRating = aggregateRating;
  }

  const openingHours = buildOpeningHoursJsonLd(artist.openingHours);
  if (openingHours) {
    jsonLd.openingHoursSpecification = openingHours;
  }

  const makesOffer = buildMakesOfferJsonLd(artist.offers);
  if (makesOffer) {
    jsonLd.makesOffer = makesOffer;
  }

  return jsonLd;
}

/**
 * Generate JSON-LD BreadcrumbList schema.
 * Pass an ordered list of crumbs from root to current page.
 * Each item's `path` should be an absolute path (e.g. "/artists") or "" for home.
 */
export function getBreadcrumbJsonLd(
  items: ReadonlyArray<{ name: string; path: string }>,
): Record<string, unknown> {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: getCanonicalUrl(item.path),
    })),
  };
}

/**
 * 페이지 단위 OG / Twitter / canonical 메타데이터 통합 빌더.
 * generateMetadata 안에서 spread 로 사용: `...buildPageSeo({ title, description, path: "/artists" })`
 */
interface BasicSeoInput {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  type?: "website" | "article" | "profile";
}

export function buildPageSeo(
  input: Readonly<BasicSeoInput>,
): Pick<Metadata, "openGraph" | "twitter" | "alternates"> {
  const url = getCanonicalUrl(input.path);
  const image = input.image ?? DEFAULT_OG_IMAGE;
  return {
    alternates: getAlternates(input.path),
    openGraph: {
      title: input.title,
      description: input.description,
      type: input.type ?? "website",
      locale: "ko_KR",
      url,
      siteName: SITE_NAME,
      images: [{ url: image, width: 1200, height: 630, alt: input.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [image],
    },
  };
}

interface ProductJsonLdInput {
  name: string;
  description: string;
  image: string[];
  url: string;
  price?: number | null;
  priceCurrency?: string;
  brandName?: string | null;
  category?: string;
}

export function getProductJsonLd(input: Readonly<ProductJsonLdInput>): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    "@context": SCHEMA_CONTEXT,
    "@type": "Product",
    name: input.name,
    url: input.url,
  };
  applyDescription(jsonLd, input.description);
  if (input.image.length > 0) jsonLd.image = input.image;
  if (input.category) jsonLd.category = input.category;
  if (input.brandName) {
    jsonLd.brand = { "@type": "Brand", name: input.brandName };
  }
  if (isDefined(input.price) && input.price > 0) {
    jsonLd.offers = {
      "@type": "Offer",
      price: input.price,
      priceCurrency: input.priceCurrency ?? "KRW",
      availability: "https://schema.org/InStock",
      url: input.url,
    };
  }
  return jsonLd;
}

interface EventJsonLdInput {
  name: string;
  description: string;
  startDate: string;
  endDate?: string | null;
  url: string;
  image?: string | null;
  organizerName?: string;
  organizerUrl?: string;
}

export function getEventJsonLd(input: Readonly<EventJsonLdInput>): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    "@context": SCHEMA_CONTEXT,
    "@type": "Event",
    name: input.name,
    startDate: input.startDate,
    url: input.url,
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "VirtualLocation",
      url: input.url,
    },
    organizer: {
      "@type": "Organization",
      name: input.organizerName ?? SITE_NAME,
      url: input.organizerUrl ?? SITE_URL,
    },
  };
  applyDescription(jsonLd, input.description);
  if (input.endDate) jsonLd.endDate = input.endDate;
  if (input.image) jsonLd.image = input.image;
  return jsonLd;
}

interface CourseJsonLdInput {
  name: string;
  description: string;
  url: string;
  providerName: string;
  providerUrl?: string;
  image?: string | null;
}

export function getCourseJsonLd(input: Readonly<CourseJsonLdInput>): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    "@context": SCHEMA_CONTEXT,
    "@type": "Course",
    name: input.name,
    url: input.url,
    provider: {
      "@type": "Organization",
      name: input.providerName,
      url: input.providerUrl ?? SITE_URL,
    },
  };
  applyDescription(jsonLd, input.description);
  if (input.image) jsonLd.image = input.image;
  return jsonLd;
}

/**
 * Organization JSON-LD (홈에서 1회만 emit, WebSite 와 중복 회피)
 */
export function getOrganizationJsonLd(): Record<string, unknown> {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/ban_logo.png`,
    description: "전국 반영구 아티스트 포트폴리오·가격비교 플랫폼",
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        areaServed: "KR",
        availableLanguage: ["Korean"],
      },
    ],
    address: {
      "@type": "PostalAddress",
      addressCountry: "KR",
    },
  };
}

/**
 * Generate JSON-LD FAQPage schema (질문/답변 목록). AEO 핵심 — Google/AI 가 Q&A 를 직접 인용.
 * 빈 배열이면 호출부에서 emit 하지 말 것(빈 FAQPage 무의미).
 */
export function getFaqPageJsonLd(
  items: ReadonlyArray<{ question: string; answer: string }>,
): Record<string, unknown> {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/**
 * JSON-LD 객체를 `<script type="application/ld+json">` 안에 안전하게 임베드하기 위한 직렬화.
 * `<` 문자를 `<` 로 escape 하여 `</script>` 조기 종료 공격(XSS)을 차단한다.
 * 사용: `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(obj) }} />`
 */
export function jsonLdSafe(jsonLd: Readonly<Record<string, unknown>>): string {
  return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
}

export { SITE_URL, SITE_NAME };
