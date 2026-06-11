import type { TheoryFigure } from './theory'

// 교과서 단원(heading) → 학습용 도해 매핑.
// 이미지는 public/study/figures/ 에 있으며 gpt-image-2로 생성 + 비전 검수(라벨 정확도) 통과분.
// width/height = 원본 픽셀(next/image 비율 유지). 1024x1024 또는 1536x1024.
export const CHAPTER_FIGURES: Record<string, TheoryFigure> = {
  '두개골의 구조': {
    src: '/study/figures/skull.png',
    alt: '사람 두개골 측면도와 주요 뼈 라벨',
    caption: '두개골(측면) — 뇌머리뼈와 얼굴머리뼈',
    width: 1024,
    height: 1024,
  },
  '안면 구조와 반영구화장': {
    src: '/study/figures/face-proportions.png',
    alt: '얼굴 삼등분 비례와 눈썹 기준점',
    caption: '얼굴 비례와 눈썹머리·눈썹산·눈썹꼬리',
    width: 1024,
    height: 1024,
  },
  '피부의 구조 개관': {
    src: '/study/figures/skin-layers.png',
    alt: '피부 3층 단면(표피·진피·피하지방)',
    caption: '피부 단면 — 표피·진피·피하지방과 부속기관',
    width: 1024,
    height: 1024,
  },
  '표피(epidermis)': {
    src: '/study/figures/epidermis.png',
    alt: '표피의 다섯 층 단면',
    caption: '표피 5층 — 기저층에서 각질층까지',
    width: 1024,
    height: 1024,
  },
  '진피(dermis)': {
    src: '/study/figures/pigment-depth.png',
    alt: '문신 색소 주입 깊이 비교 단면',
    caption: '시술 깊이 — 너무 얕음·적정(진피)·너무 깊음',
    width: 1536,
    height: 1024,
  },
  '상처의 치유과정': {
    src: '/study/figures/wound-healing.png',
    alt: '상처 치유 4단계 타임라인',
    caption: '지혈기 → 염증기 → 증식기 → 성숙기',
    width: 1536,
    height: 1024,
  },
  '두피의 개념과 구조': {
    src: '/study/figures/scalp-layers.png',
    alt: '두피의 다섯 층 단면',
    caption: '두피 단면 — 피부에서 머리뼈막까지',
    width: 1024,
    height: 1024,
  },
  '모발의 생리구조': {
    src: '/study/figures/hair-structure.png',
    alt: '모발과 모낭의 세로 단면',
    caption: '모발 구조 — 모간·모근·모낭·모유두',
    width: 1024,
    height: 1024,
  },
  '모발의 성장주기와 호르몬': {
    src: '/study/figures/hair-cycle.png',
    alt: '모발 성장주기 3단계',
    caption: '성장기 · 퇴행기 · 휴지기',
    width: 1536,
    height: 1024,
  },
  '색과 색채학': {
    src: '/study/figures/color-wheel.png',
    alt: '12색 색상환과 보색 관계',
    caption: '색상환과 보색(마주 보는 색)',
    width: 1024,
    height: 1024,
  },
  '감염관리 — 표준주의': {
    src: '/study/figures/infection-chain.png',
    alt: '감염 사슬 6단계',
    caption: '감염 사슬 — 한 고리만 끊어도 차단',
    width: 1536,
    height: 1024,
  },
}
