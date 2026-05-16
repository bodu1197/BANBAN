import type { Metadata } from "next";
import { STRINGS } from "@/lib/strings";
import { buildPageSeo } from "@/lib/seo";

const SEO_DESCRIPTION =
  "반언니 개인정보처리방침 — 수집 항목, 이용 목적, 보유 기간, 제3자 제공 여부, 이용자 권리 행사 방법, 안전성 확보 조치 등 주식회사 플랫폼몬스터의 개인정보 보호 정책을 투명하고 자세하게 안내하는 공식 문서입니다.";

export async function generatePrivacyMetadata(): Promise<Metadata> {
  return {
    title: STRINGS.pages.privacy,
    description: SEO_DESCRIPTION,
    ...buildPageSeo({
      title: STRINGS.pages.privacy,
      description: SEO_DESCRIPTION,
      path: "/privacy",
    }),
  };
}

export async function renderPrivacyPage(): Promise<React.ReactElement> {
  return (
    <main className="container mx-auto flex flex-1 flex-col px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">{STRINGS.pages.privacy}</h1>

      <article className="prose prose-sm max-w-none rounded-lg border p-6">
        <div className="whitespace-pre-wrap leading-relaxed">
          {STRINGS.pages.privacyContent}
        </div>
      </article>
    </main>
  );
}
