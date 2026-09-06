import type { Metadata } from "next";
import Link from "next/link";
import { buildPageSeo, getBreadcrumbJsonLd, jsonLdSafe } from "@/lib/seo";
import { GUIDES, loadGuide } from "@/lib/guides";

const TITLE = "반영구 시술 가이드 — 눈썹·입술·아이라인·헤어라인·남자눈썹·두피문신";
const DESCRIPTION =
  "시술을 받기 전에 알아야 할 것을 시술별로 정리했습니다. 종류와 차이, 가격이 갈리는 기준, 과정과 회복, 부작용, 아티스트 고르는 법, 상담 때 물어볼 질문까지.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPageSeo({ title: TITLE, description: DESCRIPTION, path: "/guide" }),
};

const CARD =
  "block h-full rounded-lg border border-border bg-card p-4 transition-colors hover:border-brand-primary hover:bg-muted focus-visible:border-brand-primary focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** /guide 목록 — 형제 URL 6개를 홈·푸터에 나란히 노출하므로 상위 경로가 404 면 안 된다(리뷰 2026-09-07). */
export default function GuideIndexPage(): React.ReactElement {
  const breadcrumb = getBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "반영구 시술 가이드", path: "/guide" },
  ]);
  return (
    <section className="mx-auto w-full max-w-[1024px] px-4 py-6" aria-labelledby="guide-index-heading">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(breadcrumb) }} />
      <h1 id="guide-index-heading" className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        반영구 시술 가이드
      </h1>
      <p className="mt-2 text-muted-foreground">{DESCRIPTION}</p>
      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {GUIDES.map((g) => {
          const guide = loadGuide(g.slug);
          return (
            <li key={g.slug}>
              <Link href={`/guide/${g.slug}`} className={CARD}>
                <span className="block text-base font-bold text-foreground">{g.label} 가이드</span>
                {guide && <span className="mt-1 block text-sm text-muted-foreground">{guide.description}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
