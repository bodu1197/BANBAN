import "server-only";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, MapPin } from "lucide-react";
import {
  fetchLocationSeoPageBySlug,
  type LocationSeoPage,
} from "@/lib/location-seo/queries";
import { ArticleBody, FaqSection, WatermarkStamp } from "@/lib/pages/article-content";
import {
  buildPageSeo,
  getBreadcrumbJsonLd,
  getCanonicalUrl,
  getFaqPageJsonLd,
  jsonLdSafe,
} from "@/lib/seo";

export async function generateLocationDetailMetadata(
  slug: string,
): Promise<Metadata> {
  const page = await fetchLocationSeoPageBySlug(slug);
  if (!page) notFound();

  const description = page.meta_description || page.excerpt || page.title;

  return {
    title: page.meta_title || page.title,
    description,
    ...buildPageSeo({
      title: page.title,
      description,
      path: `/location/${slug}`,
      image: page.cover_image_url,
      type: "article",
    }),
  };
}

function buildArticleJsonLd(page: LocationSeoPage): string {
  return jsonLdSafe({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.meta_description || page.excerpt || page.title,
    url: getCanonicalUrl(`/location/${page.slug}`),
    image: page.cover_image_url ?? undefined,
    datePublished: page.published_at,
    dateModified: page.updated_at,
    author: { "@type": "Organization", name: "반언니" },
    publisher: {
      "@type": "Organization",
      name: "반언니",
      url: "https://banunni.com",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": getCanonicalUrl(`/location/${page.slug}`),
    },
    articleSection: page.style,
  });
}

function buildBreadcrumbJsonLd(page: LocationSeoPage): string {
  return jsonLdSafe(
    getBreadcrumbJsonLd([
      { name: "홈", path: "/" },
      { name: "지역별 반영구", path: "/location" },
      { name: page.title, path: `/location/${page.slug}` },
    ]),
  );
}

function LocationStructuredData({
  page,
}: Readonly<{ page: LocationSeoPage }>): React.ReactElement {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildArticleJsonLd(page) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildBreadcrumbJsonLd(page) }}
      />
      {page.faq?.length ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdSafe(getFaqPageJsonLd(page.faq)) }}
        />
      ) : null}
    </>
  );
}

function LocationStats({
  page,
}: Readonly<{ page: LocationSeoPage }>): React.ReactElement {
  return (
    <dl className="mb-5 grid grid-cols-2 gap-3">
      <div className="rounded-lg border border-border bg-card p-3 text-center">
        <dt className="text-xs text-muted-foreground">반언니 등록 샵</dt>
        <dd className="mt-1 text-lg font-bold text-foreground">
          {page.artist_count.toLocaleString()}곳
        </dd>
      </div>
      <div className="rounded-lg border border-border bg-card p-3 text-center">
        <dt className="text-xs text-muted-foreground">반언니 등록 작품</dt>
        <dd className="mt-1 text-lg font-bold text-foreground">
          {page.portfolio_count.toLocaleString()}개
        </dd>
      </div>
    </dl>
  );
}

 
export async function renderLocationDetailPage(
  slug: string,
): Promise<React.ReactElement> {
  const page = await fetchLocationSeoPageBySlug(slug);
  if (!page) notFound();

  const date = new Date(page.published_at).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="mx-auto w-full max-w-[1024px]">
      <LocationStructuredData page={page} />

      <div className="px-4 py-3">
        <Link
          href="/location"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="지역별 반영구 목록으로"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          지역별 반영구
        </Link>
      </div>

      {page.cover_image_url ? (
        <div className="relative w-full overflow-hidden bg-muted">
          <Image
            src={page.cover_image_url}
            alt={page.cover_image_alt ?? page.title}
            width={1200}
            height={630}
            className="h-auto w-full"
            sizes="(max-width: 767px) 100vw, 767px"
            fetchPriority="high"
            unoptimized
          />
          <WatermarkStamp />
        </div>
      ) : null}

      <div className="px-4 py-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {page.region_name}
          </span>
          <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {page.style}
          </span>
          <time className="text-xs text-muted-foreground" dateTime={page.published_at}>
            {date}
          </time>
          <span
            className="flex items-center gap-1 text-xs text-muted-foreground"
            aria-label={`조회수 ${page.view_count}`}
          >
            <Eye className="h-3 w-3" aria-hidden="true" />
            {page.view_count.toLocaleString()}회
          </span>
        </div>

        <h1 className="mb-4 text-xl font-bold leading-tight md:text-2xl">
          {page.title}
        </h1>

        <LocationStats page={page} />

        <ArticleBody content={page.content} coverImageUrl={page.cover_image_url} />
        <FaqSection faq={page.faq} />
      </div>
    </article>
  );
}
