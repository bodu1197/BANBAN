import type { Metadata } from "next";
import { STRINGS } from "@/lib/strings";
import { getAlternates } from "@/lib/seo";
import { fetchDiscountPortfolios } from "@/lib/supabase/home-queries";
import { fetchRegions } from "@/lib/supabase/queries";
import { DiscountPageClient } from "@/components/discount/DiscountPageClient";

export async function generateDiscountMetadata(): Promise<Metadata> {
  return {
    title: STRINGS.pages.discount,
    description: STRINGS.pages.discountDesc,
    alternates: getAlternates("/discount"),
  };
}

export async function renderDiscountPage(): Promise<React.ReactElement> {
  const [portfolios, regions] = await Promise.all([
    fetchDiscountPortfolios({ limit: 200 }),
    fetchRegions(),
  ]);

  return (
    <main className="mx-auto w-full max-w-[767px] pb-20">
      <DiscountPageClient
        portfolios={portfolios}
        regions={regions}
      />
    </main>
  );
}
