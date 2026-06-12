// @client-reason: 일일 목표 ±버튼 Optimistic mutation(setStudyDailyGoal)
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarDays, Minus, Plus, ArrowRight } from "lucide-react";
import { setStudyDailyGoal } from "@/lib/actions/study-progress";
import { STUDY_PRIMARY_BTN } from "@/components/study/study-styles";

const GOAL_STEP = 5;
const GOAL_MIN = 5;
const GOAL_MAX = 200;

interface WeekDay { label: string; count: number; today: boolean }

const STEP_BTN = "grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40";

export function Planner({ dDay, solvedToday, dailyGoal, week }: Readonly<{ dDay: number; solvedToday: number; dailyGoal: number; week: WeekDay[] }>): React.ReactElement {
  const [goal, setGoal] = useState(dailyGoal);
  const [, startTransition] = useTransition();

  function changeGoal(delta: number): void {
    const next = Math.max(GOAL_MIN, Math.min(GOAL_MAX, goal + delta));
    if (next === goal) return;
    const prev = goal;
    setGoal(next); // optimistic
    startTransition(async () => {
      const res = await setStudyDailyGoal(next);
      if (!res.success) setGoal(prev); // 롤백
    });
  }

  const pct = Math.min(100, Math.round((solvedToday / goal) * 100));
  const done = solvedToday >= goal;
  const maxCount = Math.max(1, ...week.map((d) => d.count));

  return (
    <div className="py-5">
      <h1 className="mb-4 text-xl font-bold">학습 플래너</h1>

      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-primary/10 text-brand-primary"><CalendarDays className="h-5 w-5" aria-hidden="true" /></span>
        <div>
          <p className="text-xs text-muted-foreground">첫 국가시험까지</p>
          <p className="text-lg font-bold tabular-nums">D-{dDay}</p>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">일일 목표</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => changeGoal(-GOAL_STEP)} disabled={goal <= GOAL_MIN} aria-label="목표 줄이기" className={STEP_BTN}><Minus className="h-4 w-4" aria-hidden="true" /></button>
            <span className="w-12 text-center text-lg font-bold tabular-nums">{goal}</span>
            <button type="button" onClick={() => changeGoal(GOAL_STEP)} disabled={goal >= GOAL_MAX} aria-label="목표 늘리기" className={STEP_BTN}><Plus className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        </div>
        <p className={`mt-3 text-sm tabular-nums ${done ? "text-emerald-600" : "text-muted-foreground"}`}>오늘 {solvedToday}/{goal}문제{done ? " · 목표 달성!" : ""}</p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`오늘 목표 달성률 ${pct}%`}>
          <div className={`h-full rounded-full ${done ? "bg-emerald-500" : "bg-brand-primary"}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-card p-5">
        <p className="mb-3 text-sm font-semibold">최근 7일 학습량</p>
        <div className="flex items-end justify-between gap-1.5">
          {week.map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-20 w-full items-end">
                <div className={`w-full rounded-t ${d.today ? "bg-brand-primary" : "bg-brand-primary/30"}`} style={{ height: `${d.count === 0 ? 0 : Math.max(8, Math.round((d.count / maxCount) * 100))}%` }} aria-hidden="true" />
              </div>
              <span className={`text-[11px] tabular-nums ${d.today ? "font-bold text-foreground" : "text-muted-foreground"}`}>{d.label}</span>
              <span className="sr-only">{d.label}요일 {d.count}문제</span>
            </div>
          ))}
        </div>
      </div>

      <Link href="/mypage/study/learn" className={`inline-flex w-full items-center justify-center gap-1.5 px-5 py-3 ${STUDY_PRIMARY_BTN}`}>
        지금 학습하기 <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
