import "server-only";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import ViewCounter from "@/components/encyclopedia/ViewCounter";
import { BoardAdminActions } from "@/components/board/BoardAdminActions";
import { fetchBoardArticleBySlug, type BoardArticle } from "@/lib/board/queries";
import {
  buildPageSeo,
  getBreadcrumbJsonLd,
  getCanonicalUrl,
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
}: Readonly<{ article: BoardArticle }>): React.ReactElement {
  const nodes = parseMarkdown(article.content);
  return (
    <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground">
      {nodes.map((node, i) => renderNode(node, `node-${i}`))}
    </div>
  );
}

function buildBreadcrumbJsonLd(article: BoardArticle): string {
  return jsonLdSafe(
    getBreadcrumbJsonLd([
      { name: "홈", path: "" },
      { name: "반영구 백과사전", path: "/encyclopedia" },
      { name: article.title, path: `/encyclopedia/${article.slug}` },
    ]),
  );
}

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

        <ArticleBody article={article} />
      </div>
    </article>
  );
}
