import "server-only";
import type { Metadata } from "next";
import { fetchBoardList } from "@/lib/board/queries";
import { buildPageSeo, getBreadcrumbJsonLd } from "@/lib/seo";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { BoardNewButton } from "@/components/board/BoardNewButton";
import { ArticleCard } from "@/components/board/ArticleCard";

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
