import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";
import {
  fetchEncyclopediaList,
  fetchEncyclopediaCategories,
  type EncyclopediaListItem,
} from "@/lib/encyclopedia/queries";
import { buildPageSeo } from "@/lib/seo";

const PER_PAGE = 60;

export async function generateEncyclopediaListMetadata(): Promise<Metadata> {
  const title = "반영구 백과사전 — 스타일·관리·시술 가이드";
  const description =
    "반영구 스타일, 부위별 가이드, 애프터케어, 관리법, 시술 안전 — 반영구 메이크업에 관한 모든 것을 정리한 한국어 백과사전. 매일 새 글이 업데이트됩니다.";
  return {
    title,
    description,
    keywords: ["반영구 백과사전", "반영구 가이드", "반영구 관리법", "반영구 부작용", "반영구 애프터케어"],
    ...buildPageSeo({ title, description, path: "/encyclopedia" }),
  };
}

function ArticleCard({
  item,
}: Readonly<{ item: EncyclopediaListItem }>): React.ReactElement {
  return (
    <Link
      href={`/encyclopedia/${item.slug}`}
      className="group flex gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {item.cover_image_url ? (
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted md:h-28 md:w-28">
          <Image
            src={item.cover_image_url}
            alt={item.title}
            fill
            className="object-cover transition-transform group-hover:scale-105 group-focus-visible:scale-105"
            sizes="(max-width: 768px) 96px, 112px"
            unoptimized
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/55 px-1 py-px text-[9px] font-bold text-white"
          >
            반언니
          </span>
        </div>
      ) : (
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground md:h-28 md:w-28">
          {item.category}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <span className="inline-block rounded bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary">
          {item.category}
        </span>
        <h2 className="mt-1 line-clamp-2 text-sm font-bold leading-snug md:text-base">
          {item.title}
        </h2>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground md:text-sm">
          {item.excerpt}
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground/70">
          <Clock className="h-3 w-3" aria-hidden="true" />
          <span>{item.reading_time_minutes}분 읽기</span>
        </div>
      </div>
    </Link>
  );
}

function chipClass(active: boolean): string {
  const base =
    "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const activeStyle = "border-brand-primary bg-brand-primary text-brand-primary-foreground";
  const inactiveStyle = "border-border bg-background text-muted-foreground hover:text-foreground";
  return `${base} ${active ? activeStyle : inactiveStyle}`;
}

function CategoryNav({
  categories,
  current,
}: Readonly<{
  categories: { category: string; count: number }[];
  current: string | null | undefined;
}>): React.ReactElement | null {
  if (categories.length === 0) return null;
  return (
    <nav
      aria-label="카테고리"
      className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3"
    >
      <Link
        href="/encyclopedia"
        aria-current={!current ? "page" : undefined}
        className={chipClass(!current)}
      >
        전체
      </Link>
      {categories.map((c) => {
        const active = current === c.category;
        return (
          <Link
            key={c.category}
            href={`/encyclopedia?category=${encodeURIComponent(c.category)}`}
            aria-current={active ? "page" : undefined}
            className={chipClass(active)}
          >
            {c.category} ({c.count})
          </Link>
        );
      })}
    </nav>
  );
}

function ArticleList({
  items,
}: Readonly<{ items: EncyclopediaListItem[] }>): React.ReactElement {
  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        아직 게시된 글이 없습니다. 매일 새로운 글이 업데이트됩니다.
      </p>
    );
  }
  return (
    <>
      {items.map((item) => (
        <ArticleCard key={item.id} item={item} />
      ))}
    </>
  );
}

export async function renderEncyclopediaListPage(options: {
  category?: string | null;
}): Promise<React.ReactElement> {
  const [{ items, count }, categories] = await Promise.all([
    fetchEncyclopediaList({ limit: PER_PAGE, offset: 0, category: options.category }),
    fetchEncyclopediaCategories(),
  ]);

  return (
    <div className="mx-auto w-full max-w-[767px]">
      <header className="border-b border-border px-4 py-5">
        <h1 className="text-lg font-bold md:text-xl">반영구 백과사전</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          전문 에디터가 정리한 반영구 지식 {count.toLocaleString()}편 — 매일 새로운 글이
          업데이트됩니다.
        </p>
      </header>
      <CategoryNav categories={categories} current={options.category} />
      <section className="flex flex-col gap-3 px-4 py-4">
        <ArticleList items={items} />
      </section>
    </div>
  );
}
