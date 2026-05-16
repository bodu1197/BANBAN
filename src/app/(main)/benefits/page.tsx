import type { Metadata } from "next";
import { Gift } from "lucide-react";
import { buildPageSeo } from "@/lib/seo";
import { fetchPromoBanners } from "@/lib/supabase/banner-queries";
import { PromoBannerGrid } from "@/components/home/PromoBannerGrid";

export const revalidate = 60;

const SEO_TITLE = "혜택모음";
const SEO_DESCRIPTION =
  "반언니에서 제공하는 반영구 시술 할인, 신규 회원 가입 혜택, 시즌 기획전, 한정 프로모션과 쿠폰을 한곳에서 확인하세요. 매주 새로운 혜택이 업데이트되며 인기 아티스트의 특가 슬롯과 우수 회원 전용 혜택도 함께 안내합니다.";

export const metadata: Metadata = {
  title: SEO_TITLE,
  description: SEO_DESCRIPTION,
  keywords: ["반언니 혜택", "반영구 할인", "반영구 프로모션", "반영구 쿠폰"],
  ...buildPageSeo({
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    path: "/benefits",
  }),
};

export default async function Page(): Promise<React.ReactElement> {
  const banners = await fetchPromoBanners();
  const hasBanners = banners.length > 0;

  return (
    <main className="mx-auto w-full max-w-[767px] px-0 py-6">
      <header className="flex items-center gap-3 px-4 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary/10">
          <Gift className="h-5 w-5 text-brand-primary" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold">혜택모음</h1>
      </header>

      {hasBanners ? (
        <PromoBannerGrid banners={banners} />
      ) : (
        <div className="mt-8 flex flex-col items-center justify-center px-4 py-16 text-center">
          <p className="text-muted-foreground">
            등록된 혜택이 없습니다.
            <br />
            곧 다양한 혜택으로 찾아뵙겠습니다.
          </p>
        </div>
      )}
    </main>
  );
}
