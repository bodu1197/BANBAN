import type { Metadata } from "next";
import { STRINGS } from "@/lib/strings";
import { buildPageSeo, getBreadcrumbJsonLd } from "@/lib/seo";
import { fetchExhibitions } from "@/lib/supabase/exhibition-queries";
import { ExhibitionCategoryTabs } from "@/components/exhibition/ExhibitionCategoryTabs";
import { JsonLdScript } from "@/components/seo/JsonLdScript";

// UI 라벨(STRINGS.pages.exhibition = "기획전")과 분리 — <title> 이 "기획전 | 반언니" 라 검색어가 없었다.
const SEO_TITLE = "반영구 기획전 — 시즌 특가·테마별 시술 모음";

const SEO_DESCRIPTION =
  "반영구 특별 기획전 — 한정 할인, 신규 아티스트 데뷔전, 시즌 컬렉션 등 반언니가 큐레이션한 기획전을 확인하세요. 매월 새로운 테마로 업데이트되는 인기 반영구 이벤트와 한정 프로모션을 가장 먼저 만나볼 수 있습니다.";

export async function generateExhibitionMetadata(): Promise<Metadata> {
  return {
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    keywords: ["반영구 기획전", "반영구 할인", "반영구 이벤트", "반영구 시즌 특가"],
    ...buildPageSeo({
      title: SEO_TITLE,
      description: SEO_DESCRIPTION,
      path: "/exhibition",
    }),
  };
}

export async function renderExhibitionPage(): Promise<React.ReactElement> {
  const exhibitions = await fetchExhibitions();
  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: STRINGS.pages.exhibition, path: "/exhibition" },
  ]);

  return (
    <div className="mx-auto w-full max-w-[1024px] px-4 py-6">
      <JsonLdScript jsonLd={breadcrumbJsonLd} />
      {/* h1 이 아예 없어 검색엔진이 페이지 주제를 잡을 단서가 없었다(2026-08-14 실측). */}
      <h1 className="sr-only">{SEO_TITLE}</h1>
      <ExhibitionCategoryTabs items={exhibitions} />
    </div>
  );
}
