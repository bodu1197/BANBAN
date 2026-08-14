import { createPortfolioPageMetadata, createPortfolioPage } from "@/lib/portfolio-page";

// 필터는 useUrlSearchParams 로 읽는다 — 근거는 그 훅의 JSDoc 참조(src/hooks/useUrlSearchParams.ts).
export const revalidate = 300;

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
