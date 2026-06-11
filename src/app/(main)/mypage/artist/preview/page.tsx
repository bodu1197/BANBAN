import type { Metadata } from "next";
import { renderOwnArtistPreviewPage } from "@/lib/pages/artist-detail-page";

// 본인 전용 비공개 미리보기 — 검색 색인 금지.
export const metadata: Metadata = {
  title: "내 샵 미리보기",
  robots: { index: false, follow: false },
};

// 로그인 사용자별 동적 렌더(캐시 금지) — 본인 샵을 status 무관 조회.
export const dynamic = "force-dynamic";

export default async function Page(): Promise<React.ReactElement> {
  return renderOwnArtistPreviewPage();
}
