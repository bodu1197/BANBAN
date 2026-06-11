// 적응형 출제 엔진(L1) — 순수. nunsinpass adaptive.ts 의 IRT 능력추정·약점가중 출제·결과분석만 흡수.
// localStorage 회차상태(exam:v1)·AI생성풀(aiq:v1)·recordSession 제거 → 회차상태는 인자 주입,
// 기록은 Server Action(@/lib/actions/study-progress). AI 보충(registerGeneratedQuestions)은 영구 제외.
import {
  QUESTIONS,
  SUBJECTS,
  SUBJECT_TO_PARTS,
  getDifficulty,
  getTopicKey,
  type Question,
  type SubjectKey,
} from "@/data/study/questions";
import { subjectExamWeights, partsForTopic } from "@/data/study/blueprint";
import type { AnswerRecord } from "@/lib/study/progress";

const SUBJECT_KEYS: SubjectKey[] = SUBJECTS.map((s) => s.key);

const K = 0.18; // 능력 갱신 학습률
const PASS_RATE = 0.6; // 합격선 60%
const DIFFICULTY_SIGMA = 0.6; // 목표 난이도 근접 가우시안 폭(표준편차)

/** 난이도(1·2·3) → 문항 난이도 모수 b. */
function bParam(difficulty: number): number {
  if (difficulty <= 1) return -1;
  if (difficulty >= 3) return 1;
  return 0;
}
function bOf(q: Readonly<Question>): number {
  return bParam(q.difficulty ?? getDifficulty(q.id));
}
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}
function clamp(min: number, max: number, v: number): number {
  return Math.max(min, Math.min(max, v));
}
function emptySubjectRecord(): Record<SubjectKey, number> {
  return { hygiene: 0, anatomy: 0, ink_material: 0, law: 0 };
}

// ───────────────────────── 능력 추정 ─────────────────────────

export interface Ability {
  /** 전체 능력 θ (대략 -2 ~ 2) */
  global: number;
  bySubject: Record<SubjectKey, number>;
  attemptsBySubject: Record<SubjectKey, number>;
  /** 과목별 숙련도 0~1 (= sigmoid θ) */
  masteryBySubject: Record<SubjectKey, number>;
}

/** 풀이 기록을 시간순 재생하며 과목별 능력 θ를 추정(순수). */
export function estimateAbility(answers: readonly AnswerRecord[]): Ability {
  const theta = emptySubjectRecord();
  const counts = emptySubjectRecord();
  const sorted = [...answers].sort((a, b) => a.at - b.at);

  for (const a of sorted) {
    const subj = a.subject;
    if (!SUBJECT_KEYS.includes(subj)) continue;
    const expected = sigmoid(theta[subj] - bParam(getDifficulty(a.questionId)));
    theta[subj] += K * ((a.correct ? 1 : 0) - expected);
    counts[subj] += 1;
  }

  const mastery = emptySubjectRecord();
  let sum = 0;
  for (const key of SUBJECT_KEYS) {
    theta[key] = clamp(-2, 2, theta[key]);
    mastery[key] = sigmoid(theta[key]);
    sum += theta[key];
  }
  return {
    global: sum / SUBJECT_KEYS.length,
    bySubject: theta,
    attemptsBySubject: counts,
    masteryBySubject: mastery,
  };
}

// ───────────────────────── 회차 상태(인자 주입) ─────────────────────────

export interface SessionResult {
  sessionNo: number;
  at: number;
  score: number;
  total: number;
  targetDifficulty: number;
  abilityBefore: number;
  abilityAfter: number;
}

/** 회차 상태(스페이싱용). 서버(study_exam_sessions)에서 재구성해 주입. */
export interface SessionState {
  completed: number;
  lastIds: readonly string[];
}

// ───────────────────────── 출제 생성 ─────────────────────────

export interface GeneratedExam {
  sessionNo: number;
  /** 1~3 (하~상) 연속값 */
  targetDifficulty: number;
  readonly questions: readonly Question[];
  readonly blueprint: readonly { subject: SubjectKey; count: number }[];
  ability: Ability;
}

function itemWeight(q: Readonly<Question>, target: number, recent: ReadonlySet<string>, seen: ReadonlySet<string>): number {
  const b = bOf(q);
  let w = Math.exp(-((b - target) ** 2) / (2 * DIFFICULTY_SIGMA * DIFFICULTY_SIGMA)) + 0.05;
  if (recent.has(q.id)) w *= 0.03; // 직전 회차 문항 강한 패널티
  else if (seen.has(q.id)) w *= 0.45; // 과거에 본 문항 약한 패널티
  return w;
}

/** 가중치 기반 무복원 추출. */
function weightedPick<T>(pool: readonly T[], n: number, weightFn: (t: T) => number): T[] {
  const items = pool.map((t) => ({ t, w: Math.max(1e-6, weightFn(t)) }));
  const out: T[] = [];
  const take = Math.min(n, items.length);
  for (let i = 0; i < take; i++) {
    const total = items.reduce((s, it) => s + it.w, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let j = 0; j < items.length; j++) {
      r -= items[j].w;
      if (r <= 0) { idx = j; break; }
    }
    out.push(items[idx].t);
    items.splice(idx, 1);
  }
  return out;
}

/** size>=과목수면 모든 과목 최소 1문항 보장(가장 많은 과목에서 차감). */
function ensureCoverage(counts: Record<SubjectKey, number>, size: number): void {
  if (size < SUBJECT_KEYS.length) return;
  for (const key of SUBJECT_KEYS) {
    if (counts[key] !== 0) continue;
    const max = SUBJECT_KEYS.reduce((m, x) => (counts[x] > counts[m] ? x : m), SUBJECT_KEYS[0]);
    if (counts[max] > 1) {
      counts[max] -= 1;
      counts[key] = 1;
    }
  }
}

function allocate(weights: Record<SubjectKey, number>, size: number): Record<SubjectKey, number> {
  const sum = SUBJECT_KEYS.reduce((s, k) => s + weights[k], 0) || 1;
  const raw = SUBJECT_KEYS.map((k) => ({ k, v: (weights[k] / sum) * size }));
  const counts = emptySubjectRecord();
  let assigned = 0;
  for (const { k, v } of raw) {
    counts[k] = Math.floor(v);
    assigned += counts[k];
  }
  const rem = raw.map(({ k, v }) => ({ k, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac);
  let i = 0;
  while (assigned < size && rem.length > 0) {
    counts[rem[i % rem.length].k] += 1;
    assigned += 1;
    i += 1;
  }
  ensureCoverage(counts, size);
  return counts;
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

function subjectWeights(ability: Ability): Record<SubjectKey, number> {
  const examW = subjectExamWeights();
  const weights = emptySubjectRecord();
  for (const s of SUBJECT_KEYS) {
    const weakness = 1 - ability.masteryBySubject[s]; // 0~1
    weights[s] = examW[s] * (0.6 + 0.8 * weakness);
  }
  return weights;
}

/** 다음 회차 시험 생성(순수, Math.random 사용). answers·session 은 서버에서 주입. */
export function generateExam(answers: readonly AnswerRecord[], session: Readonly<SessionState>, size = 15): GeneratedExam {
  const ability = estimateAbility(answers);
  const sessionNo = session.completed + 1;
  // 목표 난이도: 능력 + 회차 램프(정답률 60~75% 도전구간).
  const target = clamp(1, 3, 1.6 + ability.global * 0.7 + Math.min(1.0, (sessionNo - 1) * 0.03));
  const counts = allocate(subjectWeights(ability), size);

  const recent = new Set(session.lastIds);
  const seen = new Set(answers.map((a) => a.questionId));

  const picked: Question[] = [];
  for (const s of SUBJECT_KEYS) {
    const need = counts[s];
    if (need <= 0) continue;
    const pool = QUESTIONS.filter((q) => q.subject === s);
    picked.push(...weightedPick(pool, need, (q) => itemWeight(q, target, recent, seen)));
  }

  return {
    sessionNo,
    targetDifficulty: target,
    questions: shuffle(picked),
    blueprint: SUBJECT_KEYS.map((s) => ({ subject: s, count: counts[s] })).filter((b) => b.count > 0),
    ability,
  };
}

// ───────────────────────── 결과 분석 ─────────────────────────

export interface SubjectScore {
  subject: SubjectKey;
  correct: number;
  total: number;
  rate: number;
}
export interface DifficultyScore {
  difficulty: number;
  correct: number;
  total: number;
  rate: number;
}
export interface ExamAnalysis {
  score: number;
  total: number;
  rate: number;
  passed: boolean;
  readonly bySubject: readonly SubjectScore[];
  readonly byDifficulty: readonly DifficultyScore[];
  abilityBefore: number;
  abilityAfter: number;
  abilityDelta: number;
  /** 정답률이 합격선 미만인 약점 과목(낮은 순) */
  readonly weakSubjects: readonly SubjectKey[];
  /** 복습 권장 교과서 PART id (중복 제거) */
  readonly reviewParts: readonly string[];
}

interface Agg {
  subj: Map<SubjectKey, { correct: number; total: number }>;
  diff: Map<number, { correct: number; total: number }>;
  wrongTopics: string[];
}

function aggregate(questions: readonly Question[], correctById: Record<string, boolean>): Agg {
  const subj = new Map<SubjectKey, { correct: number; total: number }>();
  const diff = new Map<number, { correct: number; total: number }>();
  const wrongTopics: string[] = [];
  for (const q of questions) {
    const ok = correctById[q.id] === true;
    const sa = subj.get(q.subject) ?? { correct: 0, total: 0 };
    sa.total += 1;
    if (ok) sa.correct += 1;
    subj.set(q.subject, sa);

    const d = getDifficulty(q.id);
    const da = diff.get(d) ?? { correct: 0, total: 0 };
    da.total += 1;
    if (ok) da.correct += 1;
    diff.set(d, da);

    if (!ok) {
      const t = getTopicKey(q.id);
      if (t) wrongTopics.push(t);
    }
  }
  return { subj, diff, wrongTopics };
}

function computeReviewParts(weakSubjects: readonly SubjectKey[], wrongTopics: readonly string[]): string[] {
  const parts: string[] = [];
  const push = (p: string): void => {
    if (!parts.includes(p)) parts.push(p);
  };
  for (const t of wrongTopics) partsForTopic(t).forEach(push);
  for (const s of weakSubjects) (SUBJECT_TO_PARTS[s] ?? []).forEach(push);
  return parts;
}

/** 능력 변화(전/후) — 합성 답안으로 after 추정. */
function abilityDelta(beforeAnswers: readonly AnswerRecord[], questions: readonly Question[], correctById: Record<string, boolean>): { before: number; after: number } {
  const before = estimateAbility(beforeAnswers).global;
  const baseAt = beforeAnswers.reduce((m, a) => Math.max(m, a.at), 0);
  const synthetic: AnswerRecord[] = questions.map((q, i) => ({
    questionId: q.id,
    subject: q.subject,
    correct: correctById[q.id] === true,
    at: baseAt + i + 1,
  }));
  const after = estimateAbility([...beforeAnswers, ...synthetic]).global;
  return { before, after };
}

/** 회차 결과 분석(순수). */
export function analyzeResult(
  questions: readonly Question[],
  correctById: Record<string, boolean>,
  beforeAnswers: readonly AnswerRecord[] = [],
): ExamAnalysis {
  const total = questions.length;
  const { subj, diff, wrongTopics } = aggregate(questions, correctById);
  const score = [...subj.values()].reduce((s, v) => s + v.correct, 0);

  const bySubject: SubjectScore[] = [...subj.entries()].map(([subject, v]) => ({
    subject, correct: v.correct, total: v.total, rate: v.total ? v.correct / v.total : 0,
  }));
  const byDifficulty: DifficultyScore[] = [...diff.entries()]
    .map(([difficulty, v]) => ({ difficulty, correct: v.correct, total: v.total, rate: v.total ? v.correct / v.total : 0 }))
    .sort((a, b) => a.difficulty - b.difficulty);
  const weakSubjects = bySubject.filter((s) => s.rate < PASS_RATE).sort((a, b) => a.rate - b.rate).map((s) => s.subject);
  const { before, after } = abilityDelta(beforeAnswers, questions, correctById);

  return {
    score,
    total,
    rate: total ? score / total : 0,
    passed: total ? score / total >= PASS_RATE : false,
    bySubject,
    byDifficulty,
    abilityBefore: before,
    abilityAfter: after,
    abilityDelta: after - before,
    weakSubjects,
    reviewParts: computeReviewParts(weakSubjects, wrongTopics),
  };
}

export { PASS_RATE };
