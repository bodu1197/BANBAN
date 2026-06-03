import type { Metadata } from "next";
import { buildPageSeo } from "@/lib/seo";
import { searchPortfolios, fetchCategoriesByType, fetchActiveRegions } from "@/lib/supabase/portfolio-search-queries";
import { PortfolioSearchClient } from "@/components/portfolio-search";
import { QueryProvider } from "@/providers/QueryProvider";

interface PortfolioPageConfig {
  typeArtist: "SEMI_PERMANENT";
  slug: string;
  title: string;
  description: string;
  targetGender?: "MALE" | "FEMALE" | null;
}

async function renderPortfolioMeta(config: PortfolioPageConfig): Promise<Metadata> {
  return {
    title: config.title,
    description: config.description,
    ...buildPageSeo({
      title: config.title,
      description: config.description,
      path: `/${config.slug}`,
    }),
  };
}

async function renderPortfolioContent(config: PortfolioPageConfig): Promise<React.ReactElement> {
  const [categories, regions] = await Promise.all([
    fetchCategoriesByType(config.typeArtist, config.targetGender),
    fetchActiveRegions(config.typeArtist),
  ]);

  // For beauty pages, default to the first parent category instead of showing all
  const isBeautyPage = !!config.targetGender;
  const firstParentId = isBeautyPage
    ? categories.find((c) => c.type === "GENRE")?.id
    : undefined;
  const initialResult = await searchPortfolios({
    typeArtist: config.typeArtist,
    targetGender: config.targetGender,
    categoryIds: firstParentId ? [firstParentId] : undefined,
    limit: 3,
  });

  // QueryProvider 로 wrap — usePortfolioSearch(useInfiniteQuery) 가 client context 필요.
  // (main)/layout.tsx 의 전역 Provider 가 fb336ef 에서 제거됨 → portfolio 페이지(mens/women-beauty)는
  // 자체 segment Provider 가 없어 여기서 주입. ssr:false 인 SegmentQueryProvider 대신 SSR 가능한
  // QueryProvider 사용 — initialData 가 서버 HTML 에 포함돼야 SEO/LCP 유지(ISR revalidate=300 페이지).
  return (
    <div className="mx-auto w-full max-w-[1024px]">
      <QueryProvider>
        <PortfolioSearchClient
          key={config.slug}
          initialData={initialResult.portfolios}
          initialTotalCount={initialResult.totalCount}
          typeArtist={config.typeArtist}
          categories={categories}
          regions={regions}
          targetGender={config.targetGender ?? null}
          initialCategoryIds={firstParentId ? [firstParentId] : undefined}
        />
      </QueryProvider>
    </div>
  );
}

export function createPortfolioPageMetadata(config: PortfolioPageConfig) {
  return async function generateMetadata(): Promise<Metadata> {
    return renderPortfolioMeta(config);
  };
}

export function createPortfolioPage(config: PortfolioPageConfig) {
  return async function PortfolioPage(): Promise<React.ReactElement> {
    return renderPortfolioContent(config);
  };
}
