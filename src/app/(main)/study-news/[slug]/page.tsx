/* eslint-disable no-console -- 프리렌더 실패는 빌드 로그가 유일한 탐지 수단이다(조용한 강등 방지) */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, ChevronLeft } from "lucide-react";
import { SITE_URL, jsonLdSafe, getBreadcrumbJsonLd } from "@/lib/seo";
import { getNewsBySlug, getPublishedNews } from "@/lib/study-news/store";
import { fmtDate, safeSourceUrl } from "@/lib/study-news/format";
import { StudyNewsSourceBadge } from "@/components/study/StudyNewsRow";

// 상동 — 데이터 캐시는 태그로 무효화되므로 페이지는 ISR 로 둔다.
export const revalidate = 600;

/** 발행 뉴스를 사전 생성 — 없으면 이 라우트가 완전 동적이 되어 no-store 로 나간다. */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const items = await getPublishedNews(200);
    return items.map((item) => ({ slug: item.slug }));
  } catch (e) {
    // 조용히 0개를 반환하면 프리렌더가 통째로 사라져도 아무도 모른다 — 빌드 로그가 유일한 탐지 수단.
    console.error(`[generateStaticParams] ${import.meta.url} 실패 — 온디맨드로 강등됨:`, e);
    return [];
  }
}

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> {
  const { slug } = await params;
  const item = await getNewsBySlug(slug);
  if (!item) return { title: "문신사 뉴스" };
  const description = item.summary.slice(0, 150);
  return {
    title: item.title,
    description,
    alternates: { canonical: `/study-news/${slug}` },
    openGraph: { title: item.title, description, type: "article", url: `/study-news/${slug}`, images: ["/og-image.png"] },
  };
}

export default async function StudyNewsDetailPage({ params }: Readonly<{ params: Promise<{ slug: string }> }>): Promise<React.ReactElement> {
  const { slug } = await params;
  const item = await getNewsBySlug(slug);
  if (!item) notFound();
  const src = safeSourceUrl(item.sourceUrl);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: item.title,
    description: item.summary,
    datePublished: item.publishedAt ?? undefined,
    dateModified: item.publishedAt ?? undefined,
    author: { "@type": "Organization", name: item.sourceName },
    publisher: { "@type": "Organization", name: "반언니", url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/study-news/${slug}`,
  };

  // 다른 상세(백과·지역·샵)에는 있는데 여기만 없었다 — 검색결과 탐색경로 표시가 빠진다.
  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "문신사 뉴스", path: "/study-news" },
    { name: item.title, path: `/study-news/${slug}` },
  ]);

  return (
    <article className="mx-auto max-w-2xl px-4 py-6">
      {/* JSON-LD 구조화 데이터(NewsArticle) — jsonLdSafe 로 </script> 탈출 방지 */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(breadcrumbJsonLd) }} />

      <Link href="/study-news" className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> 뉴스 목록
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <StudyNewsSourceBadge tier={item.tier} />
        <span className="text-muted-foreground">{item.sourceName}</span>
        {item.category ? <span className="text-muted-foreground">· {item.category}</span> : null}
        <span className="ml-auto tabular-nums text-muted-foreground">{fmtDate(item.publishedAt)}</span>
      </div>

      <h1 className="mt-2 text-2xl font-bold leading-tight">{item.title}</h1>
      <span className="mt-3 inline-block rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-semibold text-brand-primary">AI 요약</span>
      <p className="mt-3 whitespace-pre-line leading-relaxed text-foreground">{item.summary}</p>

      {src ? (
        <a href={src} target="_blank" rel="noopener noreferrer nofollow" className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          원문 보기 <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </a>
      ) : null}

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">AI 요약입니다. 사실·일정·기준은 원문과 보건복지부·국시원 공식 공고를 확인하세요.</p>
    </article>
  );
}
