export interface EncyclopediaTopic {
  id: number;
  title: string;
  keyword: string;
  category: string;
  slug: string;
}

export const ENCYCLOPEDIA_TOPICS: EncyclopediaTopic[] = [
  { id: 1, title: "눈썹 반영구 완벽 가이드", keyword: "눈썹반영구", category: "눈썹", slug: "eyebrow-semi-permanent-guide" },
  { id: 2, title: "콤보 눈썹이란? 시술 과정과 유지 기간", keyword: "콤보눈썹", category: "눈썹", slug: "combo-eyebrow" },
  { id: 3, title: "엠보 눈썹 시술 전 알아야 할 것", keyword: "엠보눈썹", category: "눈썹", slug: "embo-eyebrow" },
  { id: 4, title: "파우더 눈썹 특징과 유지 관리법", keyword: "파우더눈썹", category: "눈썹", slug: "powder-eyebrow" },
  { id: 5, title: "남자 눈썹 반영구 인기 디자인", keyword: "남자눈썹반영구", category: "눈썹", slug: "mens-eyebrow" },
  { id: 6, title: "눈썹 반영구 리터치 시기와 비용", keyword: "눈썹리터치", category: "눈썹", slug: "eyebrow-retouch" },
  { id: 7, title: "자연스러운 눈썹 디자인 선택법", keyword: "자연눈썹디자인", category: "눈썹", slug: "natural-eyebrow-design" },
  { id: 8, title: "눈썹 반영구 통증과 마취 방법", keyword: "눈썹반영구통증", category: "눈썹", slug: "eyebrow-pain-anesthesia" },
  { id: 9, title: "눈썹 반영구 색상 선택 가이드", keyword: "눈썹색상선택", category: "눈썹", slug: "eyebrow-color-guide" },
  { id: 10, title: "눈썹 반영구 후 주의사항", keyword: "눈썹반영구애프터케어", category: "눈썹", slug: "eyebrow-aftercare" },
  { id: 11, title: "아이라인 반영구 시술 종류", keyword: "아이라인반영구", category: "아이라인", slug: "eyeliner-semi-permanent" },
  { id: 12, title: "점막 아이라인 시술 과정", keyword: "점막아이라인", category: "아이라인", slug: "mucous-eyeliner" },
  { id: 13, title: "아이라인 반영구 유지 기간", keyword: "아이라인유지기간", category: "아이라인", slug: "eyeliner-duration" },
  { id: 14, title: "아이라인 시술 후 부기 관리", keyword: "아이라인부기", category: "아이라인", slug: "eyeliner-swelling" },
  { id: 15, title: "입술 반영구 풀립 vs 하프립 차이", keyword: "풀립하프립", category: "입술", slug: "full-lip-vs-half-lip" },
  { id: 16, title: "입술 반영구 색상 추천", keyword: "입술반영구색상", category: "입술", slug: "lip-color-guide" },
  { id: 17, title: "입술 반영구 시술 후 각질 관리", keyword: "입술각질관리", category: "입술", slug: "lip-peeling-care" },
  { id: 18, title: "입술 반영구 유지 기간과 리터치", keyword: "입술반영구유지", category: "입술", slug: "lip-duration-retouch" },
  { id: 19, title: "헤어라인 반영구 시술 과정", keyword: "헤어라인반영구", category: "헤어라인", slug: "hairline-semi-permanent" },
  { id: 20, title: "SMP 두피 문신 완벽 가이드", keyword: "SMP두피문신", category: "헤어라인", slug: "smp-scalp-guide" },
  { id: 21, title: "헤어라인 교정 시술 비용", keyword: "헤어라인교정비용", category: "헤어라인", slug: "hairline-cost" },
  { id: 22, title: "속눈썹 연장 vs 반영구 차이", keyword: "속눈썹연장반영구", category: "속눈썹", slug: "lash-extension-vs-semi" },
  { id: 23, title: "반영구 시술 전 준비사항 총정리", keyword: "반영구준비사항", category: "관리", slug: "preparation-checklist" },
  { id: 24, title: "반영구 시술 후 세안 가이드", keyword: "반영구세안", category: "관리", slug: "washing-after-procedure" },
  { id: 25, title: "반영구 제거 방법과 비용", keyword: "반영구제거", category: "관리", slug: "removal-guide" },
  { id: 26, title: "반영구 알레르기 테스트 필요성", keyword: "반영구알레르기", category: "안전", slug: "allergy-test" },
  { id: 27, title: "반영구 시술 자격증과 법률", keyword: "반영구자격증", category: "안전", slug: "certification-law" },
  { id: 28, title: "반영구 시술 위생 관리 기준", keyword: "반영구위생", category: "안전", slug: "hygiene-standards" },
  { id: 29, title: "반영구 시술 트렌드 2026", keyword: "반영구트렌드", category: "트렌드", slug: "trend-2026" },
  { id: 30, title: "얼굴형별 눈썹 디자인 추천", keyword: "얼굴형눈썹", category: "눈썹", slug: "face-shape-eyebrow" },
  { id: 31, title: "반영구 가격 비교 — 적정 시술비는?", keyword: "반영구가격", category: "관리", slug: "price-comparison" },
  { id: 32, title: "점 제거 반영구 시술 안내", keyword: "점제거", category: "기타", slug: "mole-removal" },
  { id: 33, title: "흉터 커버 반영구 시술", keyword: "흉터커버", category: "기타", slug: "scar-cover" },
  { id: 34, title: "유두 반영구 재건 시술", keyword: "유두반영구", category: "기타", slug: "areola-reconstruction" },
  { id: 35, title: "반영구 시술 연령별 추천", keyword: "연령별반영구", category: "트렌드", slug: "age-recommendation" },
];
