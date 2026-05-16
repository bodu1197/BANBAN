import type { Metadata } from "next";

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
}

function buildGeoJsonLd(artist: ArtistJsonLdInput): Record<string, unknown> | undefined {
  if (isDefined(artist.latitude) && isDefined(artist.longitude)) {
    return {
      "@type": "GeoCoordinates",
      latitude: artist.latitude,
      longitude: artist.longitude,
    };
  }
  return undefined;
}

function buildAggregateRatingJsonLd(artist: ArtistJsonLdInput): Record<string, unknown> | undefined {
  if (isDefined(artist.rating) && isDefined(artist.reviewCount) && artist.reviewCount > 0) {
    return {
      "@type": "AggregateRating",
      ratingValue: artist.rating,
      reviewCount: artist.reviewCount,
    };
  }
  return undefined;
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
    description: artist.description,
    url: artist.url,
    address: {
      "@type": "PostalAddress",
      streetAddress: artist.address,
      addressCountry: "KR",
    },
  };

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
    description: input.description,
    url: input.url,
  };
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
    description: input.description,
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
    description: input.description,
    url: input.url,
    provider: {
      "@type": "Organization",
      name: input.providerName,
      url: input.providerUrl ?? SITE_URL,
    },
  };
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
 * JSON-LD 객체를 `<script type="application/ld+json">` 안에 안전하게 임베드하기 위한 직렬화.
 * `<` 문자를 `<` 로 escape 하여 `</script>` 조기 종료 공격(XSS)을 차단한다.
 * 사용: `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(obj) }} />`
 */
export function jsonLdSafe(jsonLd: Readonly<Record<string, unknown>>): string {
  return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
}

export { SITE_URL, SITE_NAME };
