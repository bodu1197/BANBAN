import { createPortfolioPageMetadata, createPortfolioPage } from "@/lib/portfolio-page";

// 정적 프리렌더 시 usePortfolioFilters 의 useSearchParams() 가 바일아웃을 던져 본문이 통째로
// 사라진다(2026-08-14 SEO 사고: 서버 HTML 본문 0자 · h1 0개 · 색인 안 됨).
// 동적 렌더에서는 useSearchParams() 가 정상 SSR 되므로 본문·내부링크가 HTML 에 실린다.
// ponytail: 캐시 복구는 쿼리 단위(unstable_cache)로 따로 처리 — 빈 페이지를 캐시하느니 안 캐시하는 게 낫다.
export const dynamic = "force-dynamic";

const config = {
  typeArtist: "SEMI_PERMANENT" as const,
  slug: "mens-beauty",
  // UI 라벨(STRINGS.pages.mensBeauty = "남성 반영구")과 분리 — 검색 제목·설명은 검색어를 담아야 한다.
  // 기존 description 은 "남성을 위한 반영구 시술 서비스" 17자였다(2026-08-14 실측).
  title: "남자 반영구·눈썹문신 — 남자눈썹·헤어라인 가격비교",
  description:
    "남자 반영구 시술을 한곳에서 비교하세요. 남자 자연눈썹·엠보눈썹부터 헤어라인·정수리 숱채움·잔흔커버까지, 전국 인증 아티스트의 실제 시술 전후 사진과 가격을 확인하고 내게 맞는 샵을 찾아보세요.",
  targetGender: "MALE" as const,
};

export const generateMetadata = createPortfolioPageMetadata(config);
export default createPortfolioPage(config);
