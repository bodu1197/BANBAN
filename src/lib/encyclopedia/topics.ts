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

  // ── 속눈썹 확장 (CRITICAL GAP: 1→6) ─────────────────
  { id: 36, title: "속눈썹 펌 시술 과정과 유지 기간", keyword: "속눈썹펌", category: "속눈썹", slug: "lash-perm-guide" },
  { id: 37, title: "속눈썹 리프팅 효과와 주의사항", keyword: "속눈썹리프팅", category: "속눈썹", slug: "lash-lifting" },
  { id: 38, title: "속눈썹 연장 종류별 비교 가이드", keyword: "속눈썹연장종류", category: "속눈썹", slug: "lash-extension-types" },
  { id: 39, title: "속눈썹 시술 후 세안과 관리법", keyword: "속눈썹관리", category: "속눈썹", slug: "lash-aftercare" },
  { id: 40, title: "속눈썹 시술 알레르기와 부작용", keyword: "속눈썹알레르기", category: "속눈썹", slug: "lash-allergy-side-effects" },

  // ── 아이라인 확장 (4→7) ──────────────────────────────
  { id: 41, title: "숨은 아이라인 vs 또렷한 아이라인 비교", keyword: "숨은아이라인", category: "아이라인", slug: "hidden-vs-bold-eyeliner" },
  { id: 42, title: "아이라인 반영구 색상 선택과 변색", keyword: "아이라인색상", category: "아이라인", slug: "eyeliner-color-fading" },
  { id: 43, title: "아이라인 반영구 시술 통증과 마취", keyword: "아이라인통증", category: "아이라인", slug: "eyeliner-pain" },

  // ── 입술 확장 (4→8) ──────────────────────────────────
  { id: 44, title: "MLBB 입술 반영구 트렌드와 색상", keyword: "MLBB입술", category: "입술", slug: "mlbb-lip-trend" },
  { id: 45, title: "입술 반영구 시술 전 준비사항", keyword: "입술반영구준비", category: "입술", slug: "lip-preparation" },
  { id: 46, title: "입술 반영구 시술 통증과 붓기 관리", keyword: "입술반영구통증", category: "입술", slug: "lip-pain-swelling" },
  { id: 47, title: "입술 반영구 변색 원인과 예방법", keyword: "입술반영구변색", category: "입술", slug: "lip-color-change" },

  // ── 헤어라인 확장 (3→7) ──────────────────────────────
  { id: 48, title: "여성 헤어라인 반영구 디자인 가이드", keyword: "여성헤어라인", category: "헤어라인", slug: "womens-hairline" },
  { id: 49, title: "헤어라인 반영구 vs 모발이식 비교", keyword: "헤어라인모발이식", category: "헤어라인", slug: "hairline-vs-transplant" },
  { id: 50, title: "M자 이마 헤어라인 교정 시술", keyword: "M자이마교정", category: "헤어라인", slug: "m-shape-hairline" },
  { id: 51, title: "두피 SMP 색상 선택과 유지 관리", keyword: "SMP색상유지", category: "헤어라인", slug: "smp-color-maintenance" },

  // ── 남성 전용 ────────────────────────────────────────
  { id: 52, title: "남자 헤어라인 반영구 완벽 가이드", keyword: "남자헤어라인", category: "헤어라인", slug: "mens-hairline-guide" },
  { id: 53, title: "남자 두피 SMP 시술 전후 비교", keyword: "남자두피SMP", category: "헤어라인", slug: "mens-smp-before-after" },
  { id: 54, title: "남자 반영구 메이크업 트렌드 2026", keyword: "남성반영구트렌드", category: "트렌드", slug: "mens-semi-permanent-trend" },
  { id: 55, title: "남자 눈썹 관리법과 디자인 팁", keyword: "남자눈썹관리", category: "눈썹", slug: "mens-eyebrow-care" },

  // ── 실용 가이드 ──────────────────────────────────────
  { id: 56, title: "좋은 반영구 아티스트 선택하는 법", keyword: "반영구아티스트선택", category: "관리", slug: "choosing-artist" },
  { id: 57, title: "반영구 시술 실패 사례와 대처법", keyword: "반영구시술실패", category: "관리", slug: "failed-procedure-solutions" },
  { id: 58, title: "반영구 시술 부위별 통증 비교", keyword: "반영구통증비교", category: "관리", slug: "pain-comparison-by-area" },
  { id: 59, title: "계절별 반영구 시술 주의사항", keyword: "계절별반영구", category: "관리", slug: "seasonal-care" },
  { id: 60, title: "반영구 시술 전후 사진 비교 가이드", keyword: "반영구전후사진", category: "관리", slug: "before-after-photo-guide" },
  { id: 61, title: "반영구 리터치 주기와 비용 총정리", keyword: "반영구리터치비용", category: "관리", slug: "retouch-cycle-cost" },
  { id: 62, title: "반영구 시술 교정과 커버업 방법", keyword: "반영구교정커버업", category: "관리", slug: "correction-coverup" },

  // ── 안전·과학 ────────────────────────────────────────
  { id: 63, title: "반영구 색소 성분과 안전성 분석", keyword: "반영구색소성분", category: "안전", slug: "pigment-ingredients-safety" },
  { id: 64, title: "반영구 시술 후 MRI 검사 가능 여부", keyword: "반영구MRI", category: "안전", slug: "mri-after-procedure" },
  { id: 65, title: "반영구 시술과 피부 질환 주의사항", keyword: "반영구피부질환", category: "안전", slug: "skin-conditions-caution" },
  { id: 66, title: "반영구 시술 감염 예방과 응급 대처", keyword: "반영구감염예방", category: "안전", slug: "infection-prevention" },
  { id: 67, title: "임산부와 수유부의 반영구 시술 안전성", keyword: "임산부반영구", category: "안전", slug: "pregnancy-breastfeeding" },

  // ── 색소·컬러 과학 ──────────────────────────────────
  { id: 68, title: "반영구 색소 변색 원인과 과학적 원리", keyword: "반영구변색원인", category: "관리", slug: "color-fading-science" },
  { id: 69, title: "피부 톤별 반영구 색상 매칭 가이드", keyword: "피부톤색상매칭", category: "관리", slug: "skin-tone-color-matching" },
  { id: 70, title: "쿨톤·웜톤별 반영구 색상 추천", keyword: "쿨톤웜톤반영구", category: "트렌드", slug: "cool-warm-tone-colors" },

  // ── 트렌드·라이프스타일 ──────────────────────────────
  { id: 71, title: "직장인을 위한 반영구 시술 추천", keyword: "직장인반영구", category: "트렌드", slug: "office-worker-recommendation" },
  { id: 72, title: "결혼 준비 반영구 시술 타임라인", keyword: "결혼반영구", category: "트렌드", slug: "wedding-preparation-timeline" },
  { id: 73, title: "반영구 메이크업으로 모닝 루틴 시간 절약", keyword: "반영구시간절약", category: "트렌드", slug: "morning-routine-timesaver" },
  { id: 74, title: "2026 반영구 메이크업 색상 트렌드", keyword: "2026색상트렌드", category: "트렌드", slug: "color-trend-2026" },
  { id: 75, title: "반영구 시술과 피부 노화 — 나이별 변화", keyword: "반영구피부노화", category: "트렌드", slug: "aging-and-semi-permanent" },
  { id: 76, title: "운동인을 위한 반영구 시술 가이드", keyword: "운동인반영구", category: "트렌드", slug: "athlete-semi-permanent" },

  // ── 눈썹 심화 ────────────────────────────────────────
  { id: 77, title: "수지 눈썹 시술 과정과 장단점", keyword: "수지눈썹", category: "눈썹", slug: "suji-eyebrow" },
  { id: 78, title: "섀도우 눈썹 시술의 특징과 추천 대상", keyword: "섀도우눈썹", category: "눈썹", slug: "shadow-eyebrow" },
  { id: 79, title: "헤어스트로크 눈썹 시술 완벽 분석", keyword: "헤어스트로크눈썹", category: "눈썹", slug: "hair-stroke-eyebrow" },
  { id: 80, title: "눈썹 반영구 색상 변색 과정과 대처법", keyword: "눈썹변색", category: "눈썹", slug: "eyebrow-color-fading" },
  { id: 81, title: "눈썹 탈모와 반영구 시술 해결법", keyword: "눈썹탈모반영구", category: "눈썹", slug: "eyebrow-hair-loss" },
  { id: 82, title: "눈썹 반영구 시술 과정 상세 타임라인", keyword: "눈썹시술과정", category: "눈썹", slug: "eyebrow-procedure-timeline" },

  // ── 기타 특수 시술 확장 ──────────────────────────────
  { id: 83, title: "미인점 반영구 시술 위치와 디자인", keyword: "미인점반영구", category: "기타", slug: "beauty-mark" },
  { id: 84, title: "잔흔 제거 반영구 시술 방법과 비용", keyword: "잔흔제거반영구", category: "기타", slug: "scar-removal-procedure" },
  { id: 85, title: "반영구 시술 잔흔이 남는 원인과 예방", keyword: "반영구잔흔원인", category: "기타", slug: "residual-mark-prevention" },

  // ── 비교·의사결정 가이드 ─────────────────────────────
  { id: 86, title: "반영구 vs 화장품 메이크업 비용 비교", keyword: "반영구화장품비교", category: "관리", slug: "semi-permanent-vs-cosmetics" },
  { id: 87, title: "반영구 vs 영구 문신 차이점 총정리", keyword: "반영구영구문신차이", category: "관리", slug: "semi-permanent-vs-tattoo" },
  { id: 88, title: "처음 반영구 시술 받는 분을 위한 Q&A", keyword: "반영구처음", category: "관리", slug: "first-timer-qa" },
  { id: 89, title: "반영구 시술 지역별 가격 비교 2026", keyword: "반영구지역별가격", category: "관리", slug: "regional-price-comparison" },
  { id: 90, title: "반영구 시술 소요 시간 부위별 정리", keyword: "반영구시술시간", category: "관리", slug: "procedure-time-by-area" },

  // ── 전문가·자격 ──────────────────────────────────────
  { id: 91, title: "반영구 시술사가 되려면? 자격과 과정", keyword: "반영구시술사자격", category: "안전", slug: "becoming-practitioner" },
  { id: 92, title: "반영구 시술 동의서 작성 가이드", keyword: "반영구동의서", category: "안전", slug: "consent-form-guide" },

  // ── 회복·애프터케어 심화 ─────────────────────────────
  { id: 93, title: "반영구 시술 후 운동 언제부터 가능한가?", keyword: "반영구운동", category: "관리", slug: "exercise-after-procedure" },
  { id: 94, title: "반영구 시술 후 사우나·수영장 주의사항", keyword: "반영구사우나수영", category: "관리", slug: "sauna-swimming-caution" },
  { id: 95, title: "반영구 시술 후 화장 언제부터 가능한가?", keyword: "반영구화장시기", category: "관리", slug: "makeup-after-procedure" },
  { id: 96, title: "반영구 딱지와 각질 관리 완벽 가이드", keyword: "반영구딱지각질", category: "관리", slug: "scab-peeling-guide" },

  // ── 부위 조합·패키지 ─────────────────────────────────
  { id: 97, title: "눈썹 + 아이라인 동시 시술 가이드", keyword: "눈썹아이라인동시", category: "관리", slug: "eyebrow-eyeliner-combo" },
  { id: 98, title: "풀 페이스 반영구 시술 순서와 비용", keyword: "풀페이스반영구", category: "관리", slug: "full-face-semi-permanent" },

  // ── 피부 타입별 ──────────────────────────────────────
  { id: 99, title: "지성 피부의 반영구 시술 주의사항", keyword: "지성피부반영구", category: "관리", slug: "oily-skin-procedure" },
  { id: 100, title: "민감성 피부 반영구 시술 안전 가이드", keyword: "민감성피부반영구", category: "안전", slug: "sensitive-skin-guide" },
];
