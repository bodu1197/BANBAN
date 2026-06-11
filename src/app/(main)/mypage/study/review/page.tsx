import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { getStudyAnswers } from "@/lib/study/queries";
import { computeReview } from "@/lib/study/srs";
import { getQuestionById, type Question } from "@/data/study/questions";
import { Review } from "@/components/study/Review";

export const metadata: Metadata = { title: "복습 | 문신사 공부방", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ReviewPage(): Promise<React.ReactElement> {
  const user = await getUser();
  if (!user) redirect("/login");
  const answers = await getStudyAnswers(user.id);
  const info = computeReview(answers);
  // 서버에서 복습 대상 Question[] 해결 — 클라 번들 경량화.
  const dueQuestions = info.dueIds.map(getQuestionById).filter((q): q is Question => Boolean(q));
  return (
    <div>
      <h1 className="pt-5 text-xl font-bold">복습</h1>
      <Review info={info} dueQuestions={dueQuestions} />
    </div>
  );
}
