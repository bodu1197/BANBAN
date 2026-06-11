// 공부방 서버 read (Server-First). Server Component(P7-3 layout/page)에서 호출.
// createClient(server, RLS select-own)로 본인 데이터만 조회 후 순수 타입으로 매핑.
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { computeStats, isValidSubject, type AnswerRecord, type ProgressStats } from "@/lib/study/progress";
import type { SessionState } from "@/lib/study/adaptive";

export interface StudySettings {
  dailyGoal: number;
  onboarded: boolean;
  trialStartedAt: number | null;
}

const DEFAULT_GOAL = 20;

/** study_user_answers → AnswerRecord[](solved_at ISO → at epoch ms, 손상 subject 필터). */
export async function getStudyAnswers(userId: string): Promise<AnswerRecord[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("study_user_answers")
    .select("question_id, subject, is_correct, solved_at")
    .eq("user_id", userId)
    .order("solved_at", { ascending: true });
  if (!data) return [];
  return data.flatMap((r): AnswerRecord[] => {
    if (!isValidSubject(r.subject)) return [];
    return [{ questionId: r.question_id, subject: r.subject, correct: r.is_correct, at: Date.parse(r.solved_at) }];
  });
}

export async function getStudyProgress(userId: string): Promise<ProgressStats> {
  return computeStats(await getStudyAnswers(userId));
}

/** study_exam_sessions → 회차상태(completed=최신 session_no, lastIds=최신행 question_ids). */
export async function getStudySessionState(userId: string): Promise<SessionState> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("study_exam_sessions")
    .select("session_no, question_ids")
    .eq("user_id", userId)
    .order("session_no", { ascending: false })
    .limit(1);
  const last = data?.[0];
  if (!last) return { completed: 0, lastIds: [] };
  const lastIds = Array.isArray(last.question_ids)
    ? last.question_ids.filter((x): x is string => typeof x === "string")
    : [];
  return { completed: last.session_no, lastIds };
}

export async function getStudyBookmarks(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("study_user_bookmarks")
    .select("question_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => r.question_id);
}

/** study_checklist_progress → checked=true 인 item_key 맵({item_key: true}). */
export async function getStudyChecklist(userId: string): Promise<Record<string, boolean>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("study_checklist_progress")
    .select("item_key, checked")
    .eq("user_id", userId)
    .eq("checked", true);
  return Object.fromEntries((data ?? []).map((r) => [r.item_key, true]));
}

export async function getStudySettings(userId: string): Promise<StudySettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("study_user_settings")
    .select("daily_goal, onboarded, trial_started_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { dailyGoal: DEFAULT_GOAL, onboarded: false, trialStartedAt: null };
  return {
    dailyGoal: data.daily_goal,
    onboarded: data.onboarded,
    trialStartedAt: data.trial_started_at ? Date.parse(data.trial_started_at) : null,
  };
}
