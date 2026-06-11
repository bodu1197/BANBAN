import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { getStudyAnswers, getStudySettings } from "@/lib/study/queries";
import { computeStats } from "@/lib/study/progress";
import { daysUntilExam } from "@/lib/study/exam";
import { Planner } from "@/components/study/Planner";

export const metadata: Metadata = { title: "학습 플래너 | 문신사 공부방", robots: { index: false } };
export const dynamic = "force-dynamic";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const DAY_MS = 86_400_000;

export default async function PlannerPage(): Promise<React.ReactElement> {
  const user = await getUser();
  if (!user) redirect("/login");
  const [answers, settings] = await Promise.all([getStudyAnswers(user.id), getStudySettings(user.id)]);
  const stats = computeStats(answers);

  const now = new Date();
  // 최근 7일 일별 풀이 시도 수(과거→오늘 순). 서버에서 산출해 plain props 전달.
  const week = Array.from({ length: 7 }, (_, k) => {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - k));
    const start = day.getTime();
    const count = answers.filter((a) => a.at >= start && a.at < start + DAY_MS).length;
    return { label: DAY_LABELS.at(day.getDay()) ?? "", count, today: k === 6 };
  });

  return <Planner dDay={daysUntilExam(now)} solvedToday={stats.solvedToday} dailyGoal={settings.dailyGoal} week={week} />;
}
