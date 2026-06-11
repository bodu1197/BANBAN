import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { getStudyAnswers, getStudySessionState } from "@/lib/study/queries";
import { estimateAbility } from "@/lib/study/adaptive";
import { MockExam } from "@/components/study/MockExam";

export const metadata: Metadata = { title: "적응형 모의고사 | 문신사 공부방", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MockExamPage(): Promise<React.ReactElement> {
  const user = await getUser();
  if (!user) redirect("/login");
  // intro preview(능력·숙련도·회차)는 서버에서 계산 — adaptive/QUESTIONS 를 클라에 번들하지 않음.
  const [answers, session] = await Promise.all([getStudyAnswers(user.id), getStudySessionState(user.id)]);
  const ability = estimateAbility(answers);
  return (
    <MockExam intro={{ sessionNo: session.completed + 1, abilityGlobal: ability.global, mastery: ability.masteryBySubject }} />
  );
}
