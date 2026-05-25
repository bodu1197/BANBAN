import { renderArtistPortfoliosPage } from "@/lib/pages/artist-portfolios-page";

// 본인 포트폴리오 목록 — 등록/수정/삭제 직후 항상 최신 상태 표시.
// 캐시 layer (ISR / fetch cache / router cache) 전부 비활성화 → 매 요청 SSR.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function Page(): Promise<React.ReactElement> {
    return renderArtistPortfoliosPage();
}
