import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPageSeo, getBreadcrumbJsonLd, getCanonicalUrl, getFaqPageJsonLd, jsonLdSafe } from "@/lib/seo";
import { fetchRecentEncyclopediaLinks, guideLabel, guideSlugs, loadGuide, type Guide } from "@/lib/guides";
import { fetchLocationSeoList } from "@/lib/location-seo/queries";
import { GuideNavLinks } from "@/components/shared/GuideNavLinks";
import {
  CTA_PRIMARY,
  CTA_SECONDARY,
  GuideCta,
  GuideFaq,
  GuideRelatedLists,
  GuideSections,
  GuideToc,
} from "@/components/guide/GuideParts";

/** 본문은 파일이라 재검증은 지역·백과 링크 목록(DB) 몫이다. */
export const revalidate = 3600;
export const dynamicParams = false;

const LOCATION_LIMIT = 12;
const ENCYCLOPEDIA_LIMIT = 6;

export function generateStaticParams(): Array<{ slug: string }> {
  return guideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = loadGuide(slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.description,
    keywords: [...guide.keywords],
    ...buildPageSeo({ title: guide.title, description: guide.description, path: `/guide/${slug}`, type: "article" }),
  };
}

function buildJsonLd(slug: string, label: string, guide: Guide): Record<string, unknown>[] {
  const url = getCanonicalUrl(`/guide/${slug}`);
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title,
      description: guide.description,
      keywords: guide.keywords.join(", "),
      inLanguage: "ko-KR",
      mainEntityOfPage: url,
      author: { "@type": "Organization", name: "반언니" },
      publisher: {
        "@type": "Organization",
        name: "반언니",
        url: getCanonicalUrl("/"),
        logo: { "@type": "ImageObject", url: `${getCanonicalUrl("/")}ban_logo.png` },
      },
    },
    getBreadcrumbJsonLd([
      { name: "홈", path: "/" },
      { name: `${label} 가이드`, path: `/guide/${slug}` },
    ]),
    getFaqPageJsonLd(guide.faq.map((f) => ({ question: f.q, answer: f.a }))),
  ];
}

function GuideHeader({ guide, label }: Readonly<{ guide: Guide; label: string }>): React.ReactElement {
  return (
    <>
      <nav aria-label="현재 위치" className="mb-3 text-xs text-muted-foreground">
        <Link
          href="/"
          className="rounded-sm transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          홈
        </Link>
        <span aria-hidden="true" className="mx-1">
          ›
        </span>
        <span className="text-foreground">{label} 가이드</span>
      </nav>
      <header>
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground md:text-3xl">{guide.h1}</h1>
        <p className="mt-3 text-base text-muted-foreground">{guide.description}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={guide.listingPath} className={CTA_PRIMARY}>
            {label} 작품과 가격 보기
          </Link>
          <Link href="/artists" className={CTA_SECONDARY}>
            아티스트 찾기
          </Link>
        </div>
      </header>
      <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-foreground/90">
        {guide.intro.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </>
  );
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const guide = loadGuide(slug);
  if (!guide) notFound();

  const [{ items: locations }, encyclopedia] = await Promise.all([
    fetchLocationSeoList({ limit: LOCATION_LIMIT }),
    fetchRecentEncyclopediaLinks(ENCYCLOPEDIA_LIMIT),
  ]);
  const label = guideLabel(slug);

  return (
    <article className="mx-auto w-full max-w-[1024px] px-4 py-6">
      {buildJsonLd(slug, label, guide).map((d) => (
        <script key={String(d["@type"])} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(d) }} />
      ))}
      <GuideHeader guide={guide} label={label} />
      <GuideToc guide={guide} />
      <GuideSections guide={guide} />
      <GuideFaq guide={guide} />
      <GuideCta guide={guide} label={label} />
      <GuideNavLinks exceptSlug={slug} heading="다른 시술 가이드" />
      <GuideRelatedLists locations={locations} encyclopedia={encyclopedia} />
    </article>
  );
}
