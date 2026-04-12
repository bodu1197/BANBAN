import type { Metadata } from "next";
import { STRINGS } from "@/lib/strings";
import { getAlternates } from "@/lib/seo";
import { fetchExhibitions } from "@/lib/supabase/exhibition-queries";
import { ExhibitionCategoryTabs } from "@/components/exhibition/ExhibitionCategoryTabs";

export async function generateExhibitionMetadata(): Promise<Metadata> {
  return {
    title: STRINGS.pages.exhibition,
    description: STRINGS.pages.exhibitionDesc,
    alternates: getAlternates("/exhibition"),
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
