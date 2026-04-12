import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { fetchBlogPostBySlug, fetchArtistProfileImage, type BlogPost } from "@/lib/supabase/blog-queries";
import { getAlternates, getBreadcrumbJsonLd, getCanonicalUrl } from "@/lib/seo";

function getLocalizedTitle(post: BlogPost): string {
  return post.title;
}

function getLocalizedMeta(post: BlogPost): string {
  return post.meta_description ?? "";
}

function getLocalizedContent(post: BlogPost): string {
  return post.content;
}

export async function generateBlogDetailMetadata(slug: string): Promise<Metadata> {
  const post = await fetchBlogPostBySlug(slug);
  if (!post) return { title: "Not Found" };

  const title = getLocalizedTitle(post);
  const description = getLocalizedMeta(post);

  return {
    title,
    description,
    alternates: getAlternates(`/blog/${slug}`),
    openGraph: {
      title,
      description,
      type: "article",
      images: post.image_url ? [{ url: post.image_url, width: 800, height: 600 }] : [],
      publishedTime: post.created_at,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: post.image_url ? [post.image_url] : [],
    },
  };
}

function ArticleStructuredData({ post }: Readonly<{ post: BlogPost }>): React.ReactElement {
  const title = getLocalizedTitle(post);
  const description = getLocalizedMeta(post);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    image: post.image_url ?? undefined,
    datePublished: post.created_at,
    dateModified: post.created_at,
    author: {
      "@type": "Person",
      name: post.artist_name ?? "HowTattoo",
    },
    publisher: {
      "@type": "Organization",
      name: "HowTattoo",
      url: "https://howtattoo.com",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": getCanonicalUrl(`/blog/${post.slug}`),
    },
    keywords: post.tags?.join(", ") ?? "",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

function BlogArtistCard({ post, artistImage }: Readonly<{ post: BlogPost; artistImage: string | null }>): React.ReactElement | null {
  if (!post.artist_name) return null;
  return (
    <div className="mt-6 border-t border-border pt-5">
      <Link
        href={`/artists/${post.artist_id}`}
        className="flex items-center gap-3 rounded-xl bg-muted/50 p-4 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {artistImage ? (
          <Image src={artistImage} alt={post.artist_name} width={48} height={48} className="h-12 w-12 shrink-0 rounded-full object-cover" unoptimized />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-lg font-bold text-brand-primary">
            {post.artist_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{post.artist_name}</p>
          <p className="text-xs text-muted-foreground">아티스트 프로필 보기</p>
        </div>
        <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" aria-hidden="true" />
      </Link>
    </div>
  );
}

function BlogPortfolioLink({ post }: Readonly<{ post: BlogPost }>): React.ReactElement {
  return (
    <div className="mt-4 px-1 pb-2">
      <Link
        href={`/portfolios/${post.portfolio_id}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary transition-colors hover:text-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        원본 작품 보기
        <ArrowLeft className="h-3.5 w-3.5 rotate-180" aria-hidden="true" />
      </Link>
    </div>
  );
}

function BlogArticleBody({ post, title, content, date, artistImage }: Readonly<{
  post: BlogPost; title: string; content: string; date: string; artistImage: string | null;
}>): React.ReactElement {
  return (
    <div className="px-4 py-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {post.category_name ? (
          <span className="rounded bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary">{post.category_name}</span>
        ) : null}
        {post.artist_name ? (
          <Link
            href={`/artists/${post.artist_id}`}
            className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {post.artist_name}
          </Link>
        ) : null}
        <time className="text-xs text-muted-foreground/60" dateTime={post.created_at}>{date}</time>
      </div>

      <h1 className="mb-4 text-xl font-bold leading-tight">{title}</h1>

      <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-a:text-brand-primary prose-strong:text-foreground">
        {content.split("\n").map((line, i) => {
          const key = `line-${i}`;
          if (line.startsWith("## ")) return <h2 key={key} className="mb-2 mt-5 text-base font-bold">{line.replace("## ", "")}</h2>;
          if (line.startsWith("### ")) return <h3 key={key} className="mb-2 mt-4 text-sm font-bold">{line.replace("### ", "")}</h3>;
          if (line.trim() === "") return <br key={key} />;
          return <p key={key} className="mb-3 text-sm leading-relaxed">{line}</p>;
        })}
      </div>

      {post.tags && post.tags.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
          {post.tags.map(tag => (
            <span key={tag} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">#{tag}</span>
          ))}
        </div>
      ) : null}

      <BlogArtistCard post={post} artistImage={artistImage} />
      <BlogPortfolioLink post={post} />
    </div>
  );
}

export async function renderBlogDetailPage(slug: string): Promise<React.ReactElement> {
  const post = await fetchBlogPostBySlug(slug);
  if (!post) notFound();

  const artistImage = post.artist_id ? await fetchArtistProfileImage(post.artist_id) : null;
  const title = getLocalizedTitle(post);
  const content = getLocalizedContent(post);
  const date = new Date(post.created_at).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="mx-auto w-full max-w-[767px]">
      <ArticleStructuredData post={post} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            getBreadcrumbJsonLd([
              { name: "홈", path: "" },
              { name: "블로그", path: "/blog" },
              { name: title, path: `/blog/${post.slug}` },
            ]),
          ),
        }}
      />
      <div className="px-4 py-3">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Back to blog"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          블로그
        </Link>
      </div>
      {post.image_url ? (
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          <Image src={post.image_url} alt={title} fill className="object-cover" sizes="(max-width: 767px) 100vw, 767px" priority unoptimized />
        </div>
      ) : null}
      <BlogArticleBody post={post} title={title} content={content} date={date} artistImage={artistImage} />
    </article>
  );
}
