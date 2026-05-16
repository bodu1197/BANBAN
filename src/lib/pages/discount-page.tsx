import type { Metadata } from "next";
import { STRINGS } from "@/lib/strings";
import { buildPageSeo } from "@/lib/seo";
import { fetchDiscountPortfolios } from "@/lib/supabase/home-queries";
import { fetchRegions } from "@/lib/supabase/queries";
import { DiscountPageClient } from "@/components/discount/DiscountPageClient";

const SEO_DESCRIPTION =
  "반언니 한정 할인 모음 — 인기 반영구 시술을 최대 50% 할인된 가격으로 만나보세요. 눈썹·입술·아이라인 카테고리별 특가 포트폴리오를 매일 업데이트하며, 시즌 한정 할인과 신규 아티스트 데뷔 이벤트도 함께 확인할 수 있습니다.";

export async function generateDiscountMetadata(): Promise<Metadata> {
  return {
    title: STRINGS.pages.discount,
    description: SEO_DESCRIPTION,
    keywords: ["반영구 할인", "반영구 특가", "반영구 이벤트", "눈썹 문신 할인"],
    ...buildPageSeo({
      title: STRINGS.pages.discount,
      description: SEO_DESCRIPTION,
      path: "/discount",
    }),
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
