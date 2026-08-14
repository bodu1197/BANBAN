import { createPortfolioPageMetadata, createPortfolioPage } from "@/lib/portfolio-page";

// 필터는 useUrlSearchParams 로 읽는다 — 근거는 그 훅의 JSDoc 참조(src/hooks/useUrlSearchParams.ts).
export const revalidate = 300;

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
