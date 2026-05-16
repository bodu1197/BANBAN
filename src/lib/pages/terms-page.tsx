import type { Metadata } from "next";
import { STRINGS } from "@/lib/strings";
import { buildPageSeo } from "@/lib/seo";

const SEO_DESCRIPTION =
  "반언니 서비스 이용약관 — 회원가입 절차, 서비스 이용 범위, 회원의 의무와 책임의 한계, 결제·환불 정책, 분쟁 해결 절차 등 주식회사 플랫폼몬스터가 운영하는 반언니 플랫폼 이용에 관한 공식 규정을 자세히 안내합니다.";

export async function generateTermsMetadata(): Promise<Metadata> {
  return {
    title: STRINGS.pages.terms,
    description: SEO_DESCRIPTION,
    ...buildPageSeo({
      title: STRINGS.pages.terms,
      description: SEO_DESCRIPTION,
      path: "/terms",
    }),
  };
}

export async function renderTermsPage(): Promise<React.ReactElement> {
  return (
    <main className="container mx-auto flex flex-1 flex-col px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">{STRINGS.pages.terms}</h1>

      <article className="prose prose-sm max-w-none rounded-lg border p-6">
        <div className="whitespace-pre-wrap leading-relaxed">
          {STRINGS.pages.termsContent}
        </div>
      </article>
    </main>
  );
}
