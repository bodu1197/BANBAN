import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { getStudyProgress } from "@/lib/study/queries";
import { getQuestionById, type Question } from "@/data/study/questions";
import { WrongAnswers } from "@/components/study/WrongAnswers";

export const metadata: Metadata = { title: "오답노트 | 문신사 공부방", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function WrongAnswersPage(): Promise<React.ReactElement> {
  const user = await getUser();
  if (!user) redirect("/login");
  const stats = await getStudyProgress(user.id);
  // 서버에서 Question[] 해결 후 props 전달 — 클라가 전체 QUESTIONS 모듈을 번들하지 않도록.
  const questions = stats.wrongQuestionIds.map(getQuestionById).filter((q): q is Question => Boolean(q));
  return (
    <div>
      <h1 className="pt-5 text-xl font-bold">오답노트</h1>
      <WrongAnswers questions={questions} />
    </div>
  );
}
