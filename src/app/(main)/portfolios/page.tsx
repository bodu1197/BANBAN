import type { Metadata } from "next";
import { renderPortfoliosPage, generatePortfoliosMetadata } from "@/lib/pages/portfolios-page";

export const revalidate = 300;

// ⚠️ 이 파일에서 searchParams 를 읽으면 안 된다 — 한 번이라도 await 하는 순간 라우트 전체가
// 동적으로 강등돼 CDN 캐시를 못 받는다(2026-08-14 실측: 3회 연속 X-Vercel-Cache MISS).
// 2페이지 이상은 경로 세그먼트 라우트 /portfolios/page/[n] 이 담당한다.

export async function generateMetadata(): Promise<Metadata> {
  return generatePortfoliosMetadata(1);
}

export default async function Page(): Promise<React.ReactElement> {
  return renderPortfoliosPage(1);
}
