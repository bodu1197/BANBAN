import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { getStudyAnswers } from "@/lib/study/queries";
import { computeStats, type AnswerRecord, type SubjectStat } from "@/lib/study/progress";
import { SUBJECTS, getDifficulty } from "@/data/study/questions";

export const metadata: Metadata = { title: "학습 통계 | 문신사 공부방", robots: { index: false } };
export const dynamic = "force-dynamic";

function diffLabel(d: number): string {
  if (d === 1) return "하";
  if (d === 3) return "상";
  return "중";
}

interface DiffStat { difficulty: number; attempted: number; correct: number }

function difficultyStats(answers: readonly AnswerRecord[]): DiffStat[] {
  const latest = new Map<string, boolean>();
  for (const a of [...answers].sort((x, y) => x.at - y.at)) latest.set(a.questionId, a.correct);
  const agg = new Map<number, { attempted: number; correct: number }>();
  for (const [qid, ok] of latest) {
    const cur = agg.get(getDifficulty(qid)) ?? { attempted: 0, correct: 0 };
    cur.attempted += 1;
    if (ok) cur.correct += 1;
    agg.set(getDifficulty(qid), cur);
  }
  return [1, 2, 3].map((d) => {
    const v = agg.get(d) ?? { attempted: 0, correct: 0 };
    return { difficulty: d, attempted: v.attempted, correct: v.correct };
  });
}

function recentRate(answers: readonly AnswerRecord[]): { rate: number; n: number } {
  const recent = [...answers].sort((x, y) => x.at - y.at).slice(-20);
  const n = recent.length;
  return { rate: n ? Math.round((recent.filter((a) => a.correct).length / n) * 100) : 0, n };
}

export default async function StatsPage(): Promise<React.ReactElement> {
  const user = await getUser();
  if (!user) redirect("/login");
  const answers = await getStudyAnswers(user.id);
  const stats = computeStats(answers);
  const recent = recentRate(answers);
  const byDiff = difficultyStats(answers);

  return (
    <div className="py-5">
      <h1 className="mb-4 text-xl font-bold">학습 통계</h1>
      <div className="grid grid-cols-2 gap-3">
        <StatBox label="전체 정답률" value={`${stats.correctRate}%`} />
        <StatBox label={`최근 ${recent.n}문 정답률`} value={`${recent.rate}%`} />
      </div>

      <h2 className="mb-2 mt-6 text-sm font-bold">과목별 숙련도</h2>
      <div className="space-y-2.5">
        {stats.bySubject.map((s) => <SubjectBar key={s.subject} stat={s} />)}
      </div>

      <h2 className="mb-2 mt-6 text-sm font-bold">난이도별 정답률</h2>
      <div className="grid grid-cols-3 gap-2.5">
        {byDiff.map((d) => {
          const pct = d.attempted ? Math.round((d.correct / d.attempted) * 100) : 0;
          return (
            <div key={d.difficulty} className="rounded-2xl border border-border bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground">{diffLabel(d.difficulty)}</p>
              <p className="text-lg font-bold tabular-nums">{pct}%</p>
              <p className="text-[11px] tabular-nums text-muted-foreground">{d.correct}/{d.attempted}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatBox({ label, value }: Readonly<{ label: string; value: string }>): React.ReactElement {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function SubjectBar({ stat }: Readonly<{ stat: SubjectStat }>): React.ReactElement {
  const pct = stat.attempted ? Math.round((stat.correct / stat.attempted) * 100) : 0;
  const label = SUBJECTS.find((s) => s.key === stat.subject)?.label ?? stat.subject;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">{stat.correct}/{stat.attempted} · {pct}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} 정답률 ${pct}%`}>
        <div className="h-full rounded-full bg-brand-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
