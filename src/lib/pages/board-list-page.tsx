import "server-only";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { fetchBoardList, type BoardListItem } from "@/lib/board/queries";
import { buildPageSeo, getBreadcrumbJsonLd } from "@/lib/seo";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { BoardNewButton } from "@/components/board/BoardNewButton";

const PER_PAGE = 60;

export async function generateBoardListMetadata(): Promise<Metadata> {
  const title = "반영구 백과사전";
  const description =
    "반영구 화장 스타일별 가이드, 시술 정보, 애프터케어 방법 — 반영구 메이크업에 관한 모든 것을 정리한 전문 백과사전입니다.";
  return {
    title,
    description,
    ...buildPageSeo({ title, description, path: "/encyclopedia" }),
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

function ArticleCard({ item }: Readonly<{ item: BoardListItem }>): React.ReactElement {
  return (
    <Link
      href={`/encyclopedia/${item.slug}`}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
    >
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl bg-muted">
        {item.cover_image_url ? (
          <Image
            src={item.cover_image_url}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            {item.category}
          </div>
        )}
      </div>
      <div className="mt-3 px-0.5">
        <h2 className="line-clamp-2 text-[15px] font-bold leading-snug text-foreground md:text-base">
          {item.title}
        </h2>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground md:text-sm">
          {item.category}
        </p>
        <time
          className="mt-2 block text-xs text-muted-foreground"
          dateTime={item.published_at}
        >
          {formatDate(item.published_at)}
        </time>
      </div>
    </Link>
  );
}

function EmptyState(): React.ReactElement {
  return (
    <p className="col-span-full py-20 text-center text-sm text-muted-foreground">
      아직 게시된 글이 없습니다.
    </p>
  );
}

export async function renderBoardListPage(): Promise<React.ReactElement> {
  const { items, count } = await fetchBoardList({ limit: PER_PAGE, offset: 0 });

  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "반영구 백과사전", path: "/encyclopedia" },
  ]);

  return (
    <div className="mx-auto w-full max-w-[1024px] px-4 py-6">
      <JsonLdScript jsonLd={breadcrumbJsonLd} />

      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-bold md:text-xl">반영구 백과사전</h1>
        <BoardNewButton />
      </header>

      <section aria-label="백과사전 글 목록" className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          items.map((item) => <ArticleCard key={item.id} item={item} />)
        )}
      </section>

      {count > PER_PAGE ? (
        <div className="mt-10 flex justify-center">
          <span className="rounded-full border border-border px-6 py-2 text-sm text-muted-foreground">
            총 {count.toLocaleString()}편
          </span>
        </div>
      ) : null}
    </div>
  );
}
