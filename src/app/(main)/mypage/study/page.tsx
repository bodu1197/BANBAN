import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpenCheck, Pencil } from "lucide-react";
import { getUser } from "@/lib/supabase/auth";
import { SUBJECTS, getSubjectCount, type SubjectMeta } from "@/data/study/questions";
import { getStudyProgress } from "@/lib/study/queries";
import type { SubjectStat } from "@/lib/study/progress";
import { subjectGlyph } from "@/components/study/subject-icon";

export const metadata: Metadata = {
  title: "문신사 공부방",
  description: "위생·감염, 법규·면허, 색소·재료, 기초 해부 과목별 문제풀이로 문신사 국가시험을 준비하세요.",
  robots: { index: false }, // 인증 전용(1인 진도) — 색인 제외(중복/소프트404 방지)
};
export const dynamic = "force-dynamic";

export default async function StudyHomePage(): Promise<React.ReactElement> {
  const user = await getUser();
  if (!user) redirect("/login");
  const stats = await getStudyProgress(user.id);
  const statBySubject = new Map(stats.bySubject.map((s) => [s.subject, s]));

  return (
    <div className="py-5">
      <h1 className="mb-1 text-xl font-bold">문신사 공부방</h1>
      <p className="mb-4 text-sm text-muted-foreground">과목을 선택해 문제를 풀어보세요.</p>

      <div className="mb-5 grid grid-cols-3 gap-2.5">
        <SummaryCell label="푼 문제" value={`${stats.totalAttempts}`} />
        <SummaryCell label="정답률" value={`${stats.correctRate}%`} />
        <SummaryCell label="오늘" value={`${stats.solvedToday}`} />
      </div>

      <div className="space-y-3">
        {SUBJECTS.map((s) => <SubjectCard key={s.key} subject={s} stat={statBySubject.get(s.key)} />)}
      </div>
    </div>
  );
}

function SummaryCell({ label, value }: Readonly<{ label: string; value: string }>): React.ReactElement {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3 text-center shadow-sm">
      <p className="text-lg font-bold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function SubjectCard({ subject, stat }: Readonly<{ subject: SubjectMeta; stat: SubjectStat | undefined }>): React.ReactElement {
  const total = getSubjectCount(subject.key);
  const attempted = stat?.attempted ?? 0;
  const tab = "flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-primary/10 text-brand-primary">
          {subjectGlyph(subject.key, "h-[22px] w-[22px]")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{subject.label}</p>
          <p className="truncate text-sm text-muted-foreground">{subject.desc}</p>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{attempted}/{total}</span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
        <Link href={`/mypage/study/${subject.key}?mode=learn`} className={tab}>
          <BookOpenCheck className="h-4 w-4" aria-hidden="true" /> 학습 모드
        </Link>
        <Link href={`/mypage/study/${subject.key}?mode=test`} className={tab}>
          <Pencil className="h-4 w-4" aria-hidden="true" /> 시험 모드
        </Link>
      </div>
    </article>
  );
}
