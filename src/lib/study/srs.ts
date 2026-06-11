// 스페이스드 리피티션(간격 반복) — 답안 기록에서 '복습할 문제'를 계산(순수).
// 문제별 연속 정답 streak 에 따라 복습 간격을 늘린다. 틀리면 streak 리셋 → 곧 다시 복습.
import type { AnswerRecord } from "@/lib/study/progress";

const DAY = 86_400_000;
// streak(0,1,2,3,4,5+)별 복습 간격(일). SM-2 영감의 점증 간격(30일 상한).
const INTERVALS = [1, 2, 4, 8, 16, 30] as const;

interface QState {
  lastAt: number;
  streak: number;
}

function perQuestion(answers: readonly AnswerRecord[]): Map<string, QState> {
  const byQ = new Map<string, AnswerRecord[]>();
  for (const a of answers) {
    if (!a?.questionId) continue;
    const arr = byQ.get(a.questionId);
    if (arr) arr.push(a);
    else byQ.set(a.questionId, [a]);
  }
  const out = new Map<string, QState>();
  for (const [qid, arr] of byQ) {
    arr.sort((x, y) => x.at - y.at);
    let streak = 0;
    for (const a of arr) streak = a.correct ? streak + 1 : 0;
    const last = arr.at(-1);
    if (last) out.set(qid, { lastAt: last.at, streak });
  }
  return out;
}

function intervalDays(streak: number): number {
  return INTERVALS.at(Math.min(streak, INTERVALS.length - 1)) ?? 30;
}

export interface ReviewInfo {
  dueIds: string[];
  dueCount: number;
  tracked: number;
  nextDueInDays: number | null;
}

/** 복습 대상(due) 계산(순수). answers 는 서버에서 주입. */
export function computeReview(answers: readonly AnswerRecord[], now: number = Date.now()): ReviewInfo {
  const states = perQuestion(answers);
  const dueIds: string[] = [];
  let nextDelta = Infinity;
  for (const [qid, st] of states) {
    const due = st.lastAt + intervalDays(st.streak) * DAY;
    if (now >= due) dueIds.push(qid);
    else nextDelta = Math.min(nextDelta, due - now);
  }
  // streak 낮은(약한) 문제 먼저, 그다음 오래된 순.
  dueIds.sort((a, b) => {
    const sa = states.get(a);
    const sb = states.get(b);
    if (!sa || !sb) return 0;
    if (sa.streak !== sb.streak) return sa.streak - sb.streak;
    return sa.lastAt - sb.lastAt;
  });
  return {
    dueIds,
    dueCount: dueIds.length,
    tracked: states.size,
    nextDueInDays: nextDelta === Infinity ? null : Math.max(1, Math.ceil(nextDelta / DAY)),
  };
}
