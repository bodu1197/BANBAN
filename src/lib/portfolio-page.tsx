import type { Metadata } from "next";
import { getAlternates } from "@/lib/seo";
import { searchPortfolios, fetchCategoriesByType, fetchActiveRegions } from "@/lib/supabase/portfolio-search-queries";
import { PortfolioSearchClient } from "@/components/portfolio-search";

interface PortfolioPageConfig {
  typeArtist: "TATTOO" | "SEMI_PERMANENT";
  slug: string;
  title: string;
  description: string;
  targetGender?: "MALE" | "FEMALE" | null;
}

async function renderPortfolioMeta(config: PortfolioPageConfig): Promise<Metadata> {
  return {
    title: config.title,
    description: config.description,
    alternates: getAlternates(`/${config.slug}`),
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

  return (
    <main className="mx-auto w-full max-w-[767px]">
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
    </main>
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
