import "server-only";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import ViewCounter from "@/components/encyclopedia/ViewCounter";
import { BoardAdminActions } from "@/components/board/BoardAdminActions";
import { fetchBoardArticleBySlug, type BoardArticle } from "@/lib/board/queries";
import { ArticleBody, FaqSection, WatermarkStamp } from "@/lib/pages/article-content";
import {
  buildPageSeo,
  getBreadcrumbJsonLd,
  getCanonicalUrl,
  getFaqPageJsonLd,
  jsonLdSafe,
} from "@/lib/seo";

export async function generateBoardDetailMetadata(
  slug: string,
): Promise<Metadata> {
  const article = await fetchBoardArticleBySlug(slug);
  if (!article) notFound();

  const description = article.meta_description || article.excerpt || article.title;

  return {
    title: article.title,
    description,
    ...buildPageSeo({
      title: article.title,
      description,
      path: `/encyclopedia/${slug}`,
      image: article.cover_image_url,
      type: "article",
    }),
  };
}

function ArticleStructuredData({
  article,
}: Readonly<{ article: BoardArticle }>): React.ReactElement {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.meta_description || article.excerpt || article.title,
    url: getCanonicalUrl(`/encyclopedia/${article.slug}`),
    image: article.cover_image_url ?? undefined,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: { "@type": "Organization", name: "반언니" },
    publisher: {
      "@type": "Organization",
      name: "반언니",
      url: "https://banunni.com",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": getCanonicalUrl(`/encyclopedia/${article.slug}`),
    },
    articleSection: article.category,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdSafe(jsonLd) }}
    />
  );
}

function buildBreadcrumbJsonLd(article: BoardArticle): string {
  return jsonLdSafe(
    getBreadcrumbJsonLd([
      { name: "홈", path: "/" },
      { name: "반영구 백과사전", path: "/encyclopedia" },
      { name: article.title, path: `/encyclopedia/${article.slug}` },
    ]),
  );
}

// eslint-disable-next-line max-lines-per-function -- 페이지 오케스트레이터: JSON-LD 3종 + 커버 + 메타 헤더 + 본문 렌더 구조상 길이 불가피
export async function renderBoardDetailPage(
  slug: string,
): Promise<React.ReactElement> {
  const article = await fetchBoardArticleBySlug(slug);
  if (!article) notFound();

  const date = new Date(article.published_at).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="mx-auto w-full max-w-[1024px]">
      <ViewCounter slug={article.slug} />
      <ArticleStructuredData article={article} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildBreadcrumbJsonLd(article) }}
      />
      {article.faq?.length ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdSafe(getFaqPageJsonLd(article.faq)) }}
        />
      ) : null}

      <div className="px-4 py-3">
        <Link
          href="/encyclopedia"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="백과사전 목록으로"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          백과사전
        </Link>
      </div>

      {article.cover_image_url ? (
        <div className="relative w-full overflow-hidden bg-muted">
          <Image
            src={article.cover_image_url}
            alt={article.cover_image_alt ?? article.title}
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
          <span className="rounded bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary">
            {article.category}
          </span>
          <time
            className="text-xs text-muted-foreground"
            dateTime={article.published_at}
          >
            {date}
          </time>
          <span
            className="flex items-center gap-1 text-xs text-muted-foreground"
            aria-label={`조회수 ${article.view_count}`}
          >
            <Eye className="h-3 w-3" aria-hidden="true" />
            {article.view_count.toLocaleString()}회
          </span>
        </div>

        <div className="mb-4 flex justify-end">
          <BoardAdminActions
            articleId={article.id}
            slug={article.slug}
            title={article.title}
          />
        </div>

        <h1 className="mb-4 text-xl font-bold leading-tight md:text-2xl">
          {article.title}
        </h1>

        <ArticleBody content={article.content} coverImageUrl={article.cover_image_url} />
        <FaqSection faq={article.faq} />
      </div>
    </article>
  );
}
