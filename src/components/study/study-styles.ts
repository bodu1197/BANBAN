// 공부방 공용 스타일 상수. 주요 버튼(패딩은 사용처에서 추가).
export const STUDY_PRIMARY_BTN = "rounded-xl bg-brand-primary text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// 검색/필터 입력(검색·용어집 공용).
export const STUDY_INPUT = "w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// 다중 토글 필터 칩(검색 과목/난이도·용어집 카테고리 공용). active/idle 상태별 클래스.
export function studyFilterChip(active: boolean): string {
  const base = "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return active
    ? `${base} border-brand-primary bg-brand-primary/10 text-brand-primary focus-visible:border-brand-primary`
    : `${base} border-border bg-card text-muted-foreground hover:border-brand-primary hover:text-foreground focus-visible:border-brand-primary focus-visible:text-foreground`;
}
