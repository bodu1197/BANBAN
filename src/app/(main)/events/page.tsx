import type { Metadata } from "next";
import { renderEventsPage } from "@/lib/pages/events-page";
import { buildPageSeo } from "@/lib/seo";

// 브랜드는 layout.tsx 의 title.template("%s | 반언니") 이 붙인다 — 여기서 또 붙이면
// "이벤트 | 반언니 | 반언니" 가 실제로 검색결과에 나간다(2026-08-14 실측).
const title = "반영구 이벤트·할인";
const description = "반영구 메이크업 할인 이벤트를 확인하세요. 눈썹, 입술, 두피 등 다양한 시술을 특별 가격에 만나보세요.";

export const metadata: Metadata = {
  title,
  description,
  ...buildPageSeo({ title, description, path: "/events" }),
};

// 필터는 useUrlSearchParams 로 읽는다 — 근거는 그 훅의 JSDoc 참조(src/hooks/useUrlSearchParams.ts).
export const revalidate = 60;

export default async function Page(): Promise<React.ReactElement> {
  return renderEventsPage();
}
