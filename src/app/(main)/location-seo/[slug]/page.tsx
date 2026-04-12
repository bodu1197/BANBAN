import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";

export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface LocationSeoPage {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  meta_title: string;
  meta_description: string;
  keywords: string[];
  cover_image_url: string | null;
  cover_image_alt: string | null;
  faq: { question: string; answer: string }[];
  region_name: string;
  style: string;
  artist_count: number;
  portfolio_count: number;
  reading_time_minutes: number;
  published_at: string;
}

async function fetchPage(slug: string): Promise<LocationSeoPage | null> {
  const supabase = createAdminClient();
  const decoded = decodeURIComponent(slug);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- location_seo_pages not in generated types
  const { data } = await (supabase as any)
    .from("location_seo_pages")
    .select("*")
    .eq("slug", decoded)
    .eq("published", true)
    .single();
  return (data as LocationSeoPage | null) ?? null;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const page = await fetchPage(slug);
  if (!page) return { title: "페이지를 찾을 수 없습니다" };
  const cleanTitle = page.meta_title.replace(/\s*[-|–—]\s*반언니\s*$/u, "").trim();
  return {
    title: cleanTitle,
    description: page.meta_description,
    keywords: page.keywords,
    alternates: { canonical: `/location-seo/${page.slug}` },
    openGraph: {
      title: cleanTitle,
      description: page.meta_description,
      images: page.cover_image_url ? [{ url: page.cover_image_url }] : undefined,
      type: "article",
    },
  };
}

function renderMarkdown(content: string): React.ReactElement {
  // Minimal markdown: headings, paragraphs, images
  const blocks = content.split(/\n\n+/);
  return (
    <div className="prose prose-invert max-w-none">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (trimmed.startsWith("## ")) {
          return <h2 key={i} className="mt-8 text-xl font-bold text-white md:text-2xl">{trimmed.slice(3)}</h2>;
        }
        const imgMatch = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(trimmed);
        if (imgMatch) {
          return (
            <div key={i} className="my-6 overflow-hidden rounded-xl">
              <Image
                src={imgMatch[2]}
                alt={imgMatch[1]}
                width={1200}
                height={800}
                className="h-auto w-full object-cover"
              />
            </div>
          );
        }
        return <p key={i} className="mt-4 text-zinc-300 leading-relaxed">{trimmed}</p>;
      })}
    </div>
  );
}

export default async function LocationSeoDetailPage(props: PageProps): Promise<React.ReactElement> {
  const { slug } = await props.params;
  const page = await fetchPage(slug);
  if (!page) notFound();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.meta_description,
    image: page.cover_image_url ?? undefined,
    datePublished: page.published_at,
    author: { "@type": "Organization", name: "반언니" },
    publisher: { "@type": "Organization", name: "반언니" },
  };

  const faqSchema = page.faq.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  } : null;

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      {faqSchema ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      ) : null}

      <nav className="mb-4 text-xs text-zinc-500">
        <Link href="/" className="hover:text-white">홈</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">{page.region_name} · {page.style}</span>
      </nav>

      <h1 className="text-2xl font-bold text-white md:text-3xl">{page.title}</h1>
      <p className="mt-2 text-sm text-zinc-400">
        {page.region_name} · {page.style} · 등록 아티스트 {page.artist_count}명 · 작품 {page.portfolio_count}점 · 약 {page.reading_time_minutes}분
      </p>

      {page.cover_image_url ? (
        <div className="mt-6 overflow-hidden rounded-2xl">
          <Image
            src={page.cover_image_url}
            alt={page.cover_image_alt ?? page.title}
            width={1200}
            height={800}
            className="h-auto w-full object-cover"
            priority
          />
        </div>
      ) : null}

      <div className="mt-8">{renderMarkdown(page.content)}</div>

      {page.faq.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-white md:text-2xl">자주 묻는 질문</h2>
          <dl className="mt-4 space-y-4">
            {page.faq.map((f) => (
              <div key={f.question} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <dt className="font-semibold text-white">{f.question}</dt>
                <dd className="mt-2 text-sm text-zinc-300">{f.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </article>
  );
}
