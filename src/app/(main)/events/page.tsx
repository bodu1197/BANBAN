import type { Metadata } from "next";
import { renderEventsPage } from "@/lib/pages/events-page";
import { buildPageSeo } from "@/lib/seo";

const title = "이벤트 | 반언니";
const description = "반영구 메이크업 할인 이벤트를 확인하세요. 눈썹, 입술, 두피 등 다양한 시술을 특별 가격에 만나보세요.";

export const metadata: Metadata = {
  title,
  description,
  ...buildPageSeo({ title, description, path: "/events" }),
};

export const revalidate = 60;

export default async function Page(): Promise<React.ReactElement> {
  return renderEventsPage();
}
