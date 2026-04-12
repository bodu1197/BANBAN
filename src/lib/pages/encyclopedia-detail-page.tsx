import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Eye } from "lucide-react";
import ViewCounter from "@/components/encyclopedia/ViewCounter";
import {
  fetchEncyclopediaArticleBySlug,
  type EncyclopediaArticle,
} from "@/lib/encyclopedia/queries";
import {
  getAlternates,
  getBreadcrumbJsonLd,
  getCanonicalUrl,
} from "@/lib/seo";

function stripSiteSuffix(value: string): string {
  // Root layout applies `%s | 반언니` template — strip any trailing
  // "- 반언니" / "| 반언니" stored on the article so it isn't duplicated.
  return value.replace(/\s*[-|–—]\s*반언니\s*$/u, "").trim();
}

export async function generateEncyclopediaDetailMetadata(
  slug: string,
): Promise<Metadata> {
  const article = await fetchEncyclopediaArticleBySlug(slug);
  if (!article) return { title: "Not Found" };

  const cleanTitle = stripSiteSuffix(article.meta_title || article.title);

  return {
    title: cleanTitle,
    description: article.meta_description,
    keywords: article.keywords,
    alternates: getAlternates(`/encyclopedia/${slug}`),
    openGraph: {
      title: article.title,
      description: article.meta_description,
      type: "article",
      images: article.cover_image_url
        ? [{ url: article.cover_image_url, width: 1200, height: 630 }]
        : [],
      publishedTime: article.published_at,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.meta_description,
      images: article.cover_image_url ? [article.cover_image_url] : [],
    },
  };
}

function ArticleStructuredData({
  article,
}: Readonly<{ article: EncyclopediaArticle }>): React.ReactElement {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.meta_description,
    image: article.cover_image_url ?? undefined,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: { "@type": "Organization", name: "반언니" },
    publisher: {
      "@type": "Organization",
      name: "반언니",
      url: "https://howtattoo.com",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": getCanonicalUrl(`/encyclopedia/${article.slug}`),
    },
    keywords: article.keywords?.join(", ") ?? "",
    articleSection: article.category,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

function FaqStructuredData({
  faq,
}: Readonly<{ faq: { question: string; answer: string }[] }>): React.ReactElement | null {
  if (!faq?.length) return null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer,
      },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface ParsedNode {
  type: "h2" | "h3" | "p" | "img" | "br";
  text?: string;
  src?: string;
  alt?: string;
}

function parseMarkdown(content: string): ParsedNode[] {
  const lines = content.split("\n");
  const out: ParsedNode[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      out.push({ type: "br" });
      continue;
    }
    if (trimmed.startsWith("## ")) {
      out.push({ type: "h2", text: trimmed.replace(/^##\s+/, "") });
      continue;
    }
    if (trimmed.startsWith("### ")) {
      out.push({ type: "h3", text: trimmed.replace(/^###\s+/, "") });
      continue;
    }
    const imgMatch = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(trimmed);
    if (imgMatch) {
      out.push({ type: "img", alt: imgMatch[1], src: imgMatch[2] });
      continue;
    }
    out.push({ type: "p", text: trimmed });
  }
  return out;
}

function WatermarkStamp(): React.ReactElement {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-bold tracking-tight text-white shadow-sm backdrop-blur-sm md:text-xs"
    >
      반언니
    </span>
  );
}

function MarkdownImage({
  src,
  alt,
}: Readonly<{ src: string; alt?: string }>): React.ReactElement {
  return (
    <figure className="my-5 overflow-hidden rounded-lg">
      <div className="relative aspect-[4/3] w-full bg-muted">
        <Image
          src={src}
          alt={alt ?? ""}
          fill
          className="object-cover"
          sizes="(max-width: 767px) 100vw, 767px"
          unoptimized
        />
        <WatermarkStamp />
      </div>
      {alt ? (
        <figcaption className="mt-2 text-center text-xs text-muted-foreground">
          {alt}
        </figcaption>
      ) : null}
    </figure>
  );
}

function renderNode(node: ParsedNode, key: string): React.ReactElement {
  if (node.type === "h2") {
    return (
      <h2 key={key} className="mb-2 mt-6 text-base font-bold md:text-lg">
        {node.text}
      </h2>
    );
  }
  if (node.type === "h3") {
    return (
      <h3 key={key} className="mb-2 mt-4 text-sm font-bold md:text-base">
        {node.text}
      </h3>
    );
  }
  if (node.type === "img" && node.src) {
    return <MarkdownImage key={key} src={node.src} alt={node.alt} />;
  }
  if (node.type === "br") {
    return <div key={key} className="h-2" />;
  }
  return (
    <p key={key} className="mb-3 text-sm leading-relaxed md:text-[15px]">
      {node.text}
    </p>
  );
}

function ArticleBody({
  article,
}: Readonly<{ article: EncyclopediaArticle }>): React.ReactElement {
  const nodes = parseMarkdown(article.content);
  return (
    <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground">
      {nodes.map((node, i) => renderNode(node, `node-${i}`))}
    </div>
  );
}

function FaqSection({
  faq,
}: Readonly<{ faq: { question: string; answer: string }[] }>): React.ReactElement | null {
  if (!faq?.length) return null;
  return (
    <section className="mt-8 border-t border-border pt-6" aria-label="자주 묻는 질문">
      <h2 className="mb-4 text-base font-bold md:text-lg">자주 묻는 질문</h2>
      <dl className="space-y-4">
        {faq.map((q, i) => (
          <div key={`faq-${i}`} className="rounded-lg border border-border bg-muted/30 p-4">
            <dt className="text-sm font-bold text-foreground">Q. {q.question}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {q.answer}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ArticleBackLink(): React.ReactElement {
  return (
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
  );
}

function CoverImage({
  article,
}: Readonly<{ article: EncyclopediaArticle }>): React.ReactElement | null {
  if (!article.cover_image_url) return null;
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
      <Image
        src={article.cover_image_url}
        alt={article.cover_image_alt ?? article.title}
        fill
        className="object-cover"
        sizes="(max-width: 767px) 100vw, 767px"
        priority
        unoptimized
      />
      <WatermarkStamp />
    </div>
  );
}

function ArticleMeta({
  article,
  date,
}: Readonly<{ article: EncyclopediaArticle; date: string }>): React.ReactElement {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="rounded bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary">
        {article.category}
      </span>
      <time className="text-xs text-muted-foreground/70" dateTime={article.published_at}>
        {date}
      </time>
      <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
        <Clock className="h-3 w-3" aria-hidden="true" />
        {article.reading_time_minutes}분 읽기
      </span>
      <span
        className="flex items-center gap-1 text-xs text-muted-foreground/70"
        aria-label={`조회수 ${article.view_count}`}
      >
        <Eye className="h-3 w-3" aria-hidden="true" />
        {article.view_count.toLocaleString()}회
      </span>
    </div>
  );
}

function TagList({ tags }: Readonly<{ tags: string[] }>): React.ReactElement | null {
  if (!tags?.length) return null;
  return (
    <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
        >
          #{tag}
        </span>
      ))}
    </div>
  );
}

function buildBreadcrumbJsonLd(article: EncyclopediaArticle): string {
  return JSON.stringify(
    getBreadcrumbJsonLd([
      { name: "홈", path: "" },
      { name: "타투 백과사전", path: "/encyclopedia" },
      { name: article.title, path: `/encyclopedia/${article.slug}` },
    ]),
  );
}

export async function renderEncyclopediaDetailPage(
  slug: string,
): Promise<React.ReactElement> {
  const article = await fetchEncyclopediaArticleBySlug(slug);
  if (!article) notFound();

  const date = new Date(article.published_at).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="mx-auto w-full max-w-[767px]">
      <ViewCounter slug={article.slug} />
      <ArticleStructuredData article={article} />
      <FaqStructuredData faq={article.faq} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildBreadcrumbJsonLd(article) }}
      />
      <ArticleBackLink />
      <CoverImage article={article} />
      <div className="px-4 py-5">
        <ArticleMeta article={article} date={date} />
        <h1 className="mb-4 text-xl font-bold leading-tight md:text-2xl">{article.title}</h1>
        {article.excerpt ? (
          <p className="mb-5 rounded-lg border-l-4 border-brand-primary bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
            {article.excerpt}
          </p>
        ) : null}
        <ArticleBody article={article} />
        <FaqSection faq={article.faq} />
        <TagList tags={article.tags} />
      </div>
    </article>
  );
}
