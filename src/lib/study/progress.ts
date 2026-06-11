// 학습 진도 계산(순수). nunsinpass progress.ts 의 순수 계산부만 흡수 —
// localStorage/useSyncExternalStore IO 는 제거하고 Server Action(@/lib/actions/study-progress)
// + 서버 read(@/lib/study/queries)로 대체(Server-First). 서버·클라 양쪽에서 사용 가능.
import { QUESTIONS, SUBJECTS, getSubjectCount, type SubjectKey } from "@/data/study/questions";

export interface AnswerRecord {
  questionId: string;
  subject: SubjectKey;
  correct: boolean;
  /** epoch ms (절대 시각) */
  at: number;
}

export interface SubjectStat {
  subject: SubjectKey;
  attempted: number;
  correct: number;
  total: number;
}

export interface ProgressStats {
  totalAttempts: number;
  uniqueAttempted: number;
  solvedToday: number;
  correctRate: number;
  readonly bySubject: readonly SubjectStat[];
  readonly wrongQuestionIds: readonly string[];
}

const VALID_SUBJECTS = new Set<string>(SUBJECTS.map((s) => s.key));

/** 외부 데이터 손상 방어 — 유효 subject 가드. */
export function isValidSubject(s: unknown): s is SubjectKey {
  return typeof s === "string" && VALID_SUBJECTS.has(s);
}

/** 답안 식별 키(초 단위) — 중복 판별용. */
export function answerKey(a: Readonly<AnswerRecord>): string {
  return `${a.questionId}|${Math.floor(a.at / 1000)}`;
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
/** 절대 epoch ms → KST 달력 날짜(YYYY-MM-DD). 서버 TZ 무관하게 한국 날짜로 '오늘' 판정. */
function kstDateKey(ts: number): string {
  return new Date(ts + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 각 문제의 '가장 최근' 풀이 결과 맵. */
function latestByQuestion(answers: readonly AnswerRecord[]): Map<string, AnswerRecord> {
  const map = new Map<string, AnswerRecord>();
  for (const a of answers) {
    const prev = map.get(a.questionId);
    if (!prev || a.at >= prev.at) map.set(a.questionId, a);
  }
  return map;
}

function computeBySubject(latest: ReadonlyMap<string, AnswerRecord>): SubjectStat[] {
  return SUBJECTS.map((s) => {
    const ids = QUESTIONS.filter((q) => q.subject === s.key).map((q) => q.id);
    let attempted = 0;
    let correct = 0;
    for (const qid of ids) {
      const rec = latest.get(qid);
      if (rec) {
        attempted += 1;
        if (rec.correct) correct += 1;
      }
    }
    return { subject: s.key, attempted, correct, total: getSubjectCount(s.key) };
  });
}

/** 진도 통계(순수). now 는 '오늘'(KST) 기준 — 서버에서 Date.now() 주입. */
export function computeStats(answers: readonly AnswerRecord[], now: number = Date.now()): ProgressStats {
  const latest = latestByQuestion(answers);
  const totalAttempts = answers.length;
  const correctAttempts = answers.filter((a) => a.correct).length;
  const correctRate = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
  const todayKey = kstDateKey(now);
  const todayIds = new Set(answers.filter((a) => kstDateKey(a.at) === todayKey).map((a) => a.questionId));
  const wrongQuestionIds = [...latest.values()].filter((a) => !a.correct).map((a) => a.questionId);
  return {
    totalAttempts,
    uniqueAttempted: latest.size,
    solvedToday: todayIds.size,
    correctRate,
    bySubject: computeBySubject(latest),
    wrongQuestionIds,
  };
}

export const EMPTY_STATS: ProgressStats = computeStats([]);
