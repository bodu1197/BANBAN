import type { Metadata } from "next";
import { STRINGS } from "@/lib/strings";
import { buildPageSeo } from "@/lib/seo";
import { fetchExhibitions } from "@/lib/supabase/exhibition-queries";
import { ExhibitionCategoryTabs } from "@/components/exhibition/ExhibitionCategoryTabs";

const SEO_DESCRIPTION =
  "반영구 특별 기획전 — 한정 할인, 신규 아티스트 데뷔전, 시즌 컬렉션 등 반언니가 큐레이션한 기획전을 확인하세요. 매월 새로운 테마로 업데이트되는 인기 반영구 이벤트를 만나보세요.";

export async function generateExhibitionMetadata(): Promise<Metadata> {
  return {
    title: STRINGS.pages.exhibition,
    description: SEO_DESCRIPTION,
    keywords: ["반영구 기획전", "반영구 할인", "반영구 이벤트", "반영구 시즌 특가"],
    ...buildPageSeo({
      title: STRINGS.pages.exhibition,
      description: SEO_DESCRIPTION,
      path: "/exhibition",
    }),
  };
}

export async function renderExhibitionPage(): Promise<React.ReactElement> {
  const exhibitions = await fetchExhibitions();

  return (
    <main className="mx-auto w-full max-w-[767px] px-4 py-6">
      <ExhibitionCategoryTabs items={exhibitions} />
    </main>
  );
}
