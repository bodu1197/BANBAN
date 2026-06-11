// 첫 문신사 국가시험 예정일 — 단일 진실 출처(D-Day). 콘텐츠=문신사 국가시험 유지.
export const EXAM_DATE = new Date(2027, 11, 1); // 2027-12-01 시행 예정

const DAY = 1000 * 60 * 60 * 24;

export function daysUntilExam(now: Date = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.ceil((EXAM_DATE.getTime() - today.getTime()) / DAY));
}
