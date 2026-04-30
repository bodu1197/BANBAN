import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import { fetchArtistInsightBySlug, type ArtistInsight } from "@/lib/supabase/artist-insight-queries";
import { fetchArtistProfileImage } from "@/lib/supabase/blog-queries";
import { getAlternates, getBreadcrumbJsonLd, getCanonicalUrl } from "@/lib/seo";

function getLocalizedTitle(i: ArtistInsight): string {
  return i.title;
}

function getLocalizedMeta(i: ArtistInsight): string {
  return i.meta_description ?? "";
}

function getLocalizedContent(i: ArtistInsight): string {
  return i.content;
}

export async function generateInsightDetailMetadata(slug: string): Promise<Metadata> {
  const insight = await fetchArtistInsightBySlug(slug);
  if (!insight) return { title: "Not Found" };

  const title = getLocalizedTitle(insight);
  const description = getLocalizedMeta(insight);

  return {
    title,
    description,
    alternates: getAlternates(`/artist-insight/${slug}`),
    openGraph: {
      title,
      description,
      type: "article",
      images: insight.cover_image_url ? [{ url: insight.cover_image_url, width: 800, height: 600 }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: insight.cover_image_url ? [insight.cover_image_url] : [],
    },
  };
}

function InsightStructuredData({ insight }: Readonly<{ insight: ArtistInsight }>): React.ReactElement {
  const title = getLocalizedTitle(insight);
  const description = getLocalizedMeta(insight);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    image: insight.cover_image_url ?? undefined,
    datePublished: insight.created_at,
    author: { "@type": "Organization", name: "반언니" },
    publisher: { "@type": "Organization", name: "반언니", url: getCanonicalUrl("") },
    mainEntityOfPage: { "@type": "WebPage", "@id": getCanonicalUrl(`/artist-insight/${insight.slug}`) },
    keywords: insight.tags?.join(", ") ?? "",
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );
}

function InsightArtistCard({ insight, artistImage }: Readonly<{
  insight: ArtistInsight; artistImage: string | null;
}>): React.ReactElement | null {
  if (!insight.artist_name) return null;
  return (
    <div className="mt-6 border-t border-border pt-5">
      <Link
        href={`/artists/${insight.artist_id}`}
        className="flex items-center gap-3 rounded-xl bg-muted/50 p-4 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {artistImage ? (
          <Image src={artistImage} alt={insight.artist_name} width={48} height={48} className="h-12 w-12 shrink-0 rounded-full object-cover" unoptimized />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-lg font-bold text-brand-primary">
            {insight.artist_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{insight.artist_name}</p>
          <p className="text-xs text-muted-foreground">아티스트 프로필 보기</p>
        </div>
        <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" aria-hidden="true" />
      </Link>
    </div>
  );
}

function InsightStats({ insight }: Readonly<{ insight: ArtistInsight }>): React.ReactElement {
  return (
    <div className="mb-4 flex flex-wrap gap-3">
      {insight.avg_rating > 0 ? (
        <div className="flex items-center gap-1 rounded-lg bg-yellow-500/10 px-3 py-1.5">
          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" aria-hidden="true" />
          <span className="text-sm font-bold text-yellow-600">{insight.avg_rating.toFixed(1)}</span>
        </div>
      ) : null}
      <div className="rounded-lg bg-muted px-3 py-1.5 text-sm text-muted-foreground">
        {`작품 ${insight.portfolio_count}개`}
      </div>
      {insight.review_count > 0 ? (
        <div className="rounded-lg bg-muted px-3 py-1.5 text-sm text-muted-foreground">
          {`리뷰 ${insight.review_count}개`}
        </div>
      ) : null}
    </div>
  );
}

function InsightContent({ content }: Readonly<{ content: string }>): React.ReactElement {
  return (
    <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-a:text-brand-primary prose-strong:text-foreground">
      {content.split("\n").map((line, i) => {
        const key = `line-${i}`;
        if (line.startsWith("## ")) return <h2 key={key} className="mb-2 mt-5 text-base font-bold">{line.replace("## ", "")}</h2>;
        if (line.startsWith("### ")) return <h3 key={key} className="mb-2 mt-4 text-sm font-bold">{line.replace("### ", "")}</h3>;
        if (line.trim() === "") return <br key={key} />;
        return <p key={key} className="mb-3 text-sm leading-relaxed">{line}</p>;
      })}
    </div>
  );
}

function InsightTags({ insight }: Readonly<{ insight: ArtistInsight }>): React.ReactElement | null {
  if (insight.specialties.length === 0 && insight.tags.length === 0) return null;
  return (
    <>
      {insight.specialties.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
          {insight.specialties.map(s => (
            <span key={s} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{s}</span>
          ))}
        </div>
      ) : null}
      {insight.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {insight.tags.map(tag => (
            <span key={tag} className="text-xs text-muted-foreground/60">#{tag}</span>
          ))}
        </div>
      ) : null}
    </>
  );
}

function InsightHeader({ insight }: Readonly<{ insight: ArtistInsight }>): React.ReactElement {
  const date = new Date(insight.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {insight.artist_name ? (
        <Link href={`/artists/${insight.artist_id}`} className="rounded bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary transition-colors hover:bg-brand-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {insight.artist_name}
        </Link>
      ) : null}
      <time className="text-xs text-muted-foreground/60" dateTime={insight.created_at}>{date}</time>
    </div>
  );
}

export async function renderInsightDetailPage(slug: string): Promise<React.ReactElement> {
  const insight = await fetchArtistInsightBySlug(slug);
  if (!insight) notFound();

  const artistImage = await fetchArtistProfileImage(insight.artist_id);
  const title = getLocalizedTitle(insight);
  const content = getLocalizedContent(insight);

  return (
    <article className="mx-auto w-full max-w-[767px]">
      <InsightStructuredData insight={insight} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            getBreadcrumbJsonLd([
              { name: "홈", path: "" },
              { name: "아티스트 인사이트", path: "/artist-insight" },
              { name: title, path: `/artist-insight/${insight.slug}` },
            ]),
          ),
        }}
      />
      <div className="px-4 py-3">
        <Link
          href="/artist-insight"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Back to insights"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          아티스트 인사이트
        </Link>
      </div>
      {insight.cover_image_url ? (
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          <Image src={insight.cover_image_url} alt={title} fill className="object-cover" sizes="(max-width: 767px) 100vw, 767px" priority unoptimized />
        </div>
      ) : null}
      <div className="px-4 py-5">
        <InsightHeader insight={insight} />
        <h1 className="mb-4 text-xl font-bold leading-tight">{title}</h1>
        <InsightStats insight={insight} />
        <InsightContent content={content} />
        <InsightTags insight={insight} />
        <InsightArtistCard insight={insight} artistImage={artistImage} />
      </div>
    </article>
  );
}
