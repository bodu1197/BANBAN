"use server";

// 공부방 진도 mutation (Server Action). 패턴: getUser 인증 → studyEntitlement 재검증
// (layout 게이트 우회 직접호출 차단, defense-in-depth) → createAdminClient(RLS 우회) write.
import { getUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { studyEntitlement } from "@/lib/study/entitlement";
import { getStudyAnswers, getStudySessionState } from "@/lib/study/queries";
import { generateExam, analyzeResult, type ExamAnalysis } from "@/lib/study/adaptive";
import { getQuestionById, type SubjectKey, type Question } from "@/data/study/questions";
import { getPart } from "@/data/study/curriculum";

interface ActionResult {
  success: boolean;
  error?: string;
}

const DAILY_GOAL_MIN = 5;
const DAILY_GOAL_MAX = 200;
const UNAUTH = "로그인이 필요합니다";
const LOCKED = "공부방 이용 권한이 없습니다";
const MOCK_EXAM_SIZE = 15;

interface MockExamData {
  sessionNo: number;
  targetDifficulty: number;
  questions: Question[];
}

type Admin = ReturnType<typeof createAdminClient>;
type WriteAuth = { ok: true; userId: string; admin: Admin } | { ok: false; error: string };

/** 인증 + 권한(locked 차단). 통과 시 userId + admin client 반환(fail-closed).
 *  '오픈된 샵(approved_at != null) = 무조건 통과'(layout 게이트와 동일 기준, 2026-06-15). */
async function authorizeStudyWrite(): Promise<WriteAuth> {
  const user = await getUser();
  if (!user) return { ok: false, error: UNAUTH };
  const admin = createAdminClient();
  const { data: artist } = await admin
    .from("artists").select("approved_at")
    .eq("user_id", user.id).is("deleted_at", null).maybeSingle();
  if (!artist) return { ok: false, error: LOCKED };
  const { access } = studyEntitlement({ approvedAt: artist.approved_at });
  if (access === "locked") return { ok: false, error: LOCKED };
  return { ok: true, userId: user.id, admin };
}

export async function recordStudyAnswer(questionId: string, subject: SubjectKey, isCorrect: boolean, source = "quiz"): Promise<ActionResult> {
  const auth = await authorizeStudyWrite();
  if (!auth.ok) return { success: false, error: auth.error };
  const { error } = await auth.admin.from("study_user_answers").insert({
    user_id: auth.userId, question_id: questionId, subject, is_correct: isCorrect, source,
  });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function recordStudyAnswersBatch(
  records: ReadonlyArray<{ questionId: string; subject: SubjectKey; isCorrect: boolean; source?: string }>,
): Promise<ActionResult> {
  if (records.length === 0) return { success: true };
  const auth = await authorizeStudyWrite();
  if (!auth.ok) return { success: false, error: auth.error };
  const rows = records.map((r) => ({
    user_id: auth.userId, question_id: r.questionId, subject: r.subject, is_correct: r.isCorrect, source: r.source ?? "test",
  }));
  const { error } = await auth.admin.from("study_user_answers").insert(rows);
  return error ? { success: false, error: error.message } : { success: true };
}

export async function recordExamSession(input: {
  questionIds: string[];
  score: number;
  total: number;
  targetDifficulty: number;
  abilityBefore: number;
  abilityAfter: number;
}): Promise<ActionResult> {
  const auth = await authorizeStudyWrite();
  if (!auth.ok) return { success: false, error: auth.error };
  const { data: last } = await auth.admin
    .from("study_exam_sessions").select("session_no").eq("user_id", auth.userId)
    .order("session_no", { ascending: false }).limit(1).maybeSingle();
  const { error } = await auth.admin.from("study_exam_sessions").insert({
    user_id: auth.userId,
    session_no: (last?.session_no ?? 0) + 1,
    score: input.score, total: input.total, target_difficulty: input.targetDifficulty,
    ability_before: input.abilityBefore, ability_after: input.abilityAfter,
    question_ids: input.questionIds,
  });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function toggleStudyBookmark(questionId: string): Promise<{ success: boolean; bookmarked?: boolean; error?: string }> {
  const auth = await authorizeStudyWrite();
  if (!auth.ok) return { success: false, error: auth.error };
  const { data: existing } = await auth.admin
    .from("study_user_bookmarks").select("question_id")
    .eq("user_id", auth.userId).eq("question_id", questionId).maybeSingle();
  if (existing) {
    const { error } = await auth.admin.from("study_user_bookmarks").delete().eq("user_id", auth.userId).eq("question_id", questionId);
    return error ? { success: false, error: error.message } : { success: true, bookmarked: false };
  }
  // 더블클릭 경합(동시 insert) → PK 충돌 무시(이미 북마크 = 의도 충족).
  const { error } = await auth.admin.from("study_user_bookmarks")
    .upsert({ user_id: auth.userId, question_id: questionId }, { onConflict: "user_id,question_id", ignoreDuplicates: true });
  return error ? { success: false, error: error.message } : { success: true, bookmarked: true };
}

export async function setStudyDailyGoal(goal: number): Promise<ActionResult> {
  const auth = await authorizeStudyWrite();
  if (!auth.ok) return { success: false, error: auth.error };
  const clamped = Math.min(DAILY_GOAL_MAX, Math.max(DAILY_GOAL_MIN, Math.round(goal)));
  const { error } = await auth.admin.from("study_user_settings")
    .upsert({ user_id: auth.userId, daily_goal: clamped, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  return error ? { success: false, error: error.message } : { success: true };
}

// ── 적응형 모의고사 ──
// adaptive(generateExam/analyzeResult)·QUESTIONS 를 서버에 가둠(클라 번들 방지). 클라는 결과 props 만 받음.

/** 능력·약점·회차 기반 모의고사 즉석 생성(15문). 쓰기 없음, 권한만 확인. */
export async function generateMockExam(): Promise<{ ok: true; exam: MockExamData } | { ok: false; error: string }> {
  const auth = await authorizeStudyWrite();
  if (!auth.ok) return { ok: false, error: auth.error };
  const [answers, session] = await Promise.all([getStudyAnswers(auth.userId), getStudySessionState(auth.userId)]);
  const exam = generateExam(answers, session, MOCK_EXAM_SIZE);
  return { ok: true, exam: { sessionNo: exam.sessionNo, targetDifficulty: exam.targetDifficulty, questions: [...exam.questions] } };
}

/** 모의고사 채점 — 서버에서 정답 대조·분석·기록. 클라가 보낸 선택만 신뢰(본인 진도). */
export async function submitMockExam(
  questionIds: string[],
  selections: (number | null)[],
  targetDifficulty: number,
): Promise<{ ok: true; analysis: ExamAnalysis; reviewPartLinks: { id: string; title: string }[] } | { ok: false; error: string }> {
  const auth = await authorizeStudyWrite();
  if (!auth.ok) return { ok: false, error: auth.error };

  // 원본 questionIds 인덱스로 selection 을 묶어 정렬(일부 id 미해결 시 index 어긋남 방지).
  const graded = questionIds
    .map((id, i) => ({ q: getQuestionById(id), sel: selections.at(i) ?? null }))
    .filter((g): g is { q: Question; sel: number | null } => Boolean(g.q));
  const questions = graded.map((g) => g.q);
  const correctById: Record<string, boolean> = Object.fromEntries(graded.map((g) => [g.q.id, g.sel === g.q.answer]));
  const beforeAnswers = await getStudyAnswers(auth.userId); // 기록 전 = 능력변화 'before'
  const analysis = analyzeResult(questions, correctById, beforeAnswers);

  if (graded.length > 0) {
    const { error: aErr } = await auth.admin.from("study_user_answers").insert(
      graded.map((g) => ({ user_id: auth.userId, question_id: g.q.id, subject: g.q.subject, is_correct: g.sel === g.q.answer, source: "mock" })),
    );
    if (aErr) return { ok: false, error: aErr.message };
  }

  const { data: last } = await auth.admin
    .from("study_exam_sessions").select("session_no").eq("user_id", auth.userId)
    .order("session_no", { ascending: false }).limit(1).maybeSingle();
  const { error } = await auth.admin.from("study_exam_sessions").insert({
    user_id: auth.userId,
    session_no: (last?.session_no ?? 0) + 1,
    score: analysis.score, total: analysis.total, target_difficulty: targetDifficulty,
    ability_before: analysis.abilityBefore, ability_after: analysis.abilityAfter,
    question_ids: questionIds,
  });
  if (error) return { ok: false, error: error.message };
  // 약점 PART id → 교과서 제목 enrich(서버에서 getPart — 클라가 curriculum 미번들).
  const reviewPartLinks = analysis.reviewParts.map((id) => ({ id, title: getPart(id)?.title ?? id }));
  return { ok: true, analysis, reviewPartLinks };
}

// ── 실기 체크리스트 ──

/** 체크리스트 항목 토글(checked upsert). item_key='{group.key}-{index}'. */
export async function toggleStudyChecklistItem(itemKey: string, checked: boolean): Promise<ActionResult> {
  const auth = await authorizeStudyWrite();
  if (!auth.ok) return { success: false, error: auth.error };
  const { error } = await auth.admin.from("study_checklist_progress").upsert(
    { user_id: auth.userId, item_key: itemKey, checked, updated_at: new Date().toISOString() },
    { onConflict: "user_id,item_key" },
  );
  return error ? { success: false, error: error.message } : { success: true };
}

/** 체크리스트 전체 초기화(본인 행 삭제). */
export async function resetStudyChecklist(): Promise<ActionResult> {
  const auth = await authorizeStudyWrite();
  if (!auth.ok) return { success: false, error: auth.error };
  const { error } = await auth.admin.from("study_checklist_progress").delete().eq("user_id", auth.userId);
  return error ? { success: false, error: error.message } : { success: true };
}
