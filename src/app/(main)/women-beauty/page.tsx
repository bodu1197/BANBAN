import { createPortfolioPageMetadata, createPortfolioPage } from "@/lib/portfolio-page";

// 정적 프리렌더 시 usePortfolioFilters 의 useSearchParams() 가 바일아웃을 던져 본문이 통째로
// 사라진다(2026-08-14 SEO 사고: 서버 HTML 본문 0자 · h1 0개 · 색인 안 됨).
// 동적 렌더에서는 useSearchParams() 가 정상 SSR 되므로 본문·내부링크가 HTML 에 실린다.
// ponytail: 캐시 복구는 쿼리 단위(unstable_cache)로 따로 처리 — 빈 페이지를 캐시하느니 안 캐시하는 게 낫다.
export const dynamic = "force-dynamic";

const config = {
  typeArtist: "SEMI_PERMANENT" as const,
  slug: "women-beauty",
  // UI 라벨(STRINGS.pages.womenBeauty = "여성 반영구")과 분리 — 검색 제목·설명은 검색어를 담아야 한다.
  // 기존 description 은 "여성을 위한 반영구 시술 서비스" 17자였다(2026-08-14 실측).
  title: "여성 반영구·눈썹문신 — 눈썹·입술·아이라인 가격비교",
  description:
    "여성 반영구 시술을 한곳에서 비교하세요. 자연눈썹·콤보눈썹·섀도우눈썹부터 그라데이션립·아이라인·헤어라인까지, 전국 인증 아티스트의 실제 시술 사진과 가격을 확인하고 내게 맞는 샵을 찾아보세요.",
  targetGender: "FEMALE" as const,
};

export const generateMetadata = createPortfolioPageMetadata(config);
export default createPortfolioPage(config);
