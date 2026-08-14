import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { renderPortfoliosPage, generatePortfoliosMetadata } from "@/lib/pages/portfolios-page";

export const revalidate = 300;

/**
 * 선행 0·지수표기·16진수를 모두 거른다 — "02"·"2e1"·"0x10" 이 전부 2페이지로 해석되면 안 된다.
 * 자릿수도 막는다: 상한이 없으면 `/portfolios/page/99999999999999999999` 류가 계속 유효 판정을 받아
 * dynamicParams 와 겹쳐 무한한 크롤 공간이 되고, `Number()` 정밀도가 깨져 canonical 이 `1e+21` 로 나간다.
 */
const PAGE_NUMBER = /^[1-9]\d{0,4}$/;

/** 앞쪽 10페이지까지 사전 생성 — 그 뒤는 dynamicParams(기본 true)로 첫 방문 시 생성 후 캐시한다. */
const PRERENDERED_PAGES = 10;

interface PageProps {
  params: Promise<{ n: string }>;
}

/**
 * 총 페이지 수를 DB 로 세어 정확히 만들지 않는 이유: 페이지 수가 곧 빌드 산출물 목록이 되어
 * 작품이 늘 때마다 재배포해야 하고, DB 가 흔들리면 목록이 통째로 비어버린다.
 * (프리렌더 자체는 빌드 때 DB 를 친다 — `/portfolios` 와 같다. 여기서 피하는 건 "페이지 수" 의존이다.)
 */
export function generateStaticParams(): Array<{ n: string }> {
  return Array.from({ length: PRERENDERED_PAGES - 1 }, (_, i) => ({ n: String(i + 2) }));
}

/**
 * 1페이지는 정규 URL(/portfolios)로 합친다 — /page/1 이 중복 URL 이 되지 않게.
 *
 * 숫자가 아니면 404 다. 예전엔 `normalizePage` 가 뭐든 1로 바꿔 `/portfolios/page/아무거나` 가
 * 전부 200/리다이렉트로 살아났다 — dynamicParams 와 겹쳐 무한한 크롤 공간 + 온디맨드 렌더 비용이 된다.
 */
async function resolvePage(params: PageProps["params"]): Promise<number> {
  const { n } = await params;
  if (!PAGE_NUMBER.test(n)) notFound();
  if (n === "1") permanentRedirect("/portfolios");
  return Number(n);
}

export async function generateMetadata({ params }: Readonly<PageProps>): Promise<Metadata> {
  return generatePortfoliosMetadata(await resolvePage(params));
}

export default async function Page({ params }: Readonly<PageProps>): Promise<React.ReactElement> {
  return renderPortfoliosPage(await resolvePage(params));
}
