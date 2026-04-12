const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://howtattoo.com")
  .trim()
  .replace(/\/+$/, "");
const SITE_NAME = "반언니";
const SCHEMA_CONTEXT = "https://schema.org";

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
export function getArtistJsonLd(artist: ArtistJsonLdInput): Record<string, unknown> {
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

export { SITE_URL, SITE_NAME };
