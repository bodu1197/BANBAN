// @client-reason: 모의고사 타이머·문항 네비·선택(UI). 생성/채점은 Server Action(서버에서 adaptive 실행).
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Timer, Clock, Target, Check, X, ChevronRight, RefreshCw, Loader2, GraduationCap } from "lucide-react";
import { SUBJECT_MAP, type SubjectKey, type Question } from "@/data/study/question-types";
import type { ExamAnalysis } from "@/lib/study/adaptive";
import { generateMockExam, submitMockExam } from "@/lib/actions/study-progress";
import { ChoiceButton, choiceState } from "@/components/study/ChoiceButton";
import { STUDY_PRIMARY_BTN } from "@/components/study/study-styles";

const SECONDS_PER_QUESTION = 60;
const PASS_SCORE = 60; // 합격선(%)

interface MockExamState { sessionNo: number; targetDifficulty: number; questions: Question[] }
interface IntroData { sessionNo: number; abilityGlobal: number; mastery: Record<SubjectKey, number> }
type Phase = "intro" | "running" | "result";

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function abilityPct(global: number): number {
  return Math.round((1 / (1 + Math.exp(-global))) * 100);
}
function targetDiffLabel(t: number): string {
  if (t < 1.7) return "하";
  if (t < 2.4) return "중";
  return "상";
}
function diffLabel(d: number): string {
  if (d === 1) return "하";
  if (d === 3) return "상";
  return "중";
}

const TEXT_ROSE = "text-rose-600";
const BRAND_SOFT = "bg-brand-primary/10 text-brand-primary";

function gridBtnClass(isCurrent: boolean, answered: boolean): string {
  if (isCurrent) return "bg-brand-primary text-white";
  if (answered) return BRAND_SOFT;
  return "bg-muted text-muted-foreground hover:text-foreground focus-visible:text-foreground";
}

export function MockExam({ intro }: Readonly<{ intro: IntroData }>): React.ReactElement {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [exam, setExam] = useState<MockExamState | null>(null);
  const [selections, setSelections] = useState<(number | null)[]>([]);
  const [idx, setIdx] = useState(0);
  const [analysis, setAnalysis] = useState<ExamAnalysis | null>(null);
  const [reviewParts, setReviewParts] = useState<{ id: string; title: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const examRef = useRef<MockExamState | null>(null);
  const selectionsRef = useRef<(number | null)[]>([]);
  const submittingRef = useRef(false);

  const handleSubmit = useCallback(async () => {
    const ex = examRef.current;
    if (!ex || submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    try {
      const res = await submitMockExam(ex.questions.map((q) => q.id), selectionsRef.current, ex.targetDifficulty);
      if (res.ok) { setAnalysis(res.analysis); setReviewParts(res.reviewPartLinks); setPhase("result"); } else setError(res.error);
    } catch {
      setError("채점에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
      submittingRef.current = false;
    }
  }, []);

  const handleStart = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await generateMockExam();
      if (!res.ok) { setError(res.error); return; }
      const ex = res.exam;
      examRef.current = ex;
      const sel = ex.questions.map(() => null);
      selectionsRef.current = sel;
      submittingRef.current = false;
      setExam(ex);
      setSelections(sel);
      setIdx(0);
      setAnalysis(null);
      setPhase("running");
    } catch {
      setError("시험을 구성하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }, []);

  function pick(choice: number): void {
    setSelections((s) => {
      const n = s.map((v, i) => (i === idx ? choice : v));
      selectionsRef.current = n;
      return n;
    });
  }

  if (phase === "result" && analysis && exam) {
    return <ResultPhase exam={exam} selections={selections} analysis={analysis} reviewParts={reviewParts} onNext={() => { router.refresh(); setPhase("intro"); }} />;
  }
  if (phase === "running" && exam) {
    return (
      <RunningPhase
        exam={exam} selections={selections} idx={idx} busy={busy} totalSeconds={exam.questions.length * SECONDS_PER_QUESTION}
        onPick={pick} onJump={setIdx} onPrev={() => setIdx((i) => Math.max(0, i - 1))}
        onNext={() => setIdx((i) => Math.min(exam.questions.length - 1, i + 1))} onSubmit={() => void handleSubmit()}
      />
    );
  }
  return <IntroPhase intro={intro} busy={busy} error={error} onStart={() => void handleStart()} />;
}

// 타이머는 자체 remaining 상태로 격리 — 매초 리렌더가 RunningPhase(그리드·카드)로 전파되지 않게.
function ExamTimer({ totalSeconds, onExpire }: Readonly<{ totalSeconds: number; onExpire: () => void }>): React.ReactElement {
  const [remaining, setRemaining] = useState(totalSeconds);
  const onExpireRef = useRef(onExpire);
  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);
  useEffect(() => {
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { clearInterval(t); onExpireRef.current(); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);
  const lowTime = remaining <= 60;
  return (
    <span aria-live="off" className={`flex items-center gap-1.5 text-lg font-bold tabular-nums ${lowTime ? TEXT_ROSE : "text-foreground"}`}>
      <Clock className={`h-[18px] w-[18px] ${lowTime ? "motion-safe:animate-pulse" : ""}`} aria-hidden="true" /> {fmt(remaining)}
    </span>
  );
}

function Stat({ label, value }: Readonly<{ label: string; value: string }>): React.ReactElement {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-2xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function IntroPhase({ intro, busy, error, onStart }: Readonly<{ intro: IntroData; busy: boolean; error: string | null; onStart: () => void }>): React.ReactElement {
  const target = Math.max(1, Math.min(3, 1.6 + intro.abilityGlobal * 0.7 + Math.min(1.0, (intro.sessionNo - 1) * 0.03)));
  return (
    <div className="py-6">
      <div className="mb-1 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-primary/10 text-brand-primary"><Timer className="h-[19px] w-[19px]" aria-hidden="true" /></span>
        <h1 className="text-xl font-bold">적응형 모의고사</h1>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">매 회차가 능력·약점에 맞춰 새로 구성됩니다. 풀수록 약점 위주로, 난이도는 점진적으로 올라갑니다.</p>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <dl className="grid grid-cols-3 gap-3 text-center">
          <Stat label="이번 회차" value={`${intro.sessionNo}회차`} />
          <Stat label="현재 능력" value={`${abilityPct(intro.abilityGlobal)}%`} />
          <Stat label="목표 난이도" value={targetDiffLabel(target)} />
        </dl>
        <div className="mt-5 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">과목별 숙련도</p>
          {Object.values(SUBJECT_MAP).map((meta) => {
            const m = Math.round((intro.mastery[meta.key] ?? 0.5) * 100);
            return (
              <div key={meta.key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{meta.label}</span>
                  <span className="tabular-nums text-muted-foreground">{m}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={m} aria-valuemin={0} aria-valuemax={100} aria-label={`${meta.label} 숙련도 ${m}%`}>
                  <div className="h-full rounded-full bg-brand-primary" style={{ width: `${m}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
          <li>· 15문항 · 약 15분 · 합격선 {PASS_SCORE}점</li>
          <li>· 약한 과목이 더 많이, 직전 회차와 다른 문항으로 출제됩니다.</li>
          <li>· 채점 후 약점 과목을 바로 복습할 수 있습니다.</li>
        </ul>
        {error ? <p role="alert" className="mt-3 text-xs text-rose-700">{error}</p> : null}
        <button type="button" onClick={onStart} disabled={busy} aria-busy={busy} className={`mt-6 w-full py-3.5 ${STUDY_PRIMARY_BTN} flex items-center justify-center gap-1.5 disabled:opacity-50`}>
          {busy ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : null}
          {busy ? "구성 중..." : `${intro.sessionNo}회차 시험 시작`}
        </button>
      </div>
    </div>
  );
}

function RunningPhase({ exam, selections, idx, busy, totalSeconds, onPick, onJump, onPrev, onNext, onSubmit }: Readonly<{
  exam: MockExamState; selections: (number | null)[]; idx: number; busy: boolean; totalSeconds: number;
  onPick: (c: number) => void; onJump: (i: number) => void; onPrev: () => void; onNext: () => void; onSubmit: () => void;
}>): React.ReactElement {
  const questions = exam.questions;
  const current = questions[idx];
  const answeredCount = selections.filter((x) => x !== null).length;
  const isLast = idx >= questions.length - 1;
  return (
    <div className="py-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-2.5">
        <span className="text-sm tabular-nums text-muted-foreground">{answeredCount}/{questions.length} 응답 · {exam.sessionNo}회차</span>
        <ExamTimer totalSeconds={totalSeconds} onExpire={onSubmit} />
      </div>
      <div className="mb-4 grid grid-cols-10 gap-1.5">
        {questions.map((q, i) => (
          <button key={q.id} type="button" onClick={() => onJump(i)} aria-label={`${i + 1}번 문항${selections[i] !== null ? " (응답함)" : ""}`}
            className={`aspect-square rounded-lg text-[11px] font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${gridBtnClass(i === idx, selections[i] !== null)}`}>
            {i + 1}
          </button>
        ))}
      </div>
      {current ? (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{SUBJECT_MAP[current.subject].label}</span>
            <span className="text-xs tabular-nums text-muted-foreground">{idx + 1} / {questions.length}</span>
          </div>
          <p className="font-medium leading-relaxed">{current.question}</p>
          <div className="mt-5 space-y-2.5">
            {current.choices.map((choice, ci) => (
              <ChoiceButton key={ci} index={ci} label={choice} state={choiceState(false, selections[idx], current.answer, ci)} onClick={() => onPick(ci)} />
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-4 flex items-center gap-2.5">
        <button type="button" onClick={onPrev} disabled={idx === 0}
          className="rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40">이전</button>
        {isLast ? (
          <button type="button" onClick={onSubmit} disabled={busy} aria-busy={busy} className={`flex-1 px-4 py-3 ${STUDY_PRIMARY_BTN} bg-emerald-600 hover:bg-emerald-700 focus-visible:bg-emerald-700 disabled:opacity-50`}>
            {busy ? "채점 중..." : "제출하고 채점"}
          </button>
        ) : (
          <button type="button" onClick={onNext} className={`flex-1 px-4 py-3 ${STUDY_PRIMARY_BTN}`}>다음</button>
        )}
      </div>
      <button type="button" onClick={onSubmit} disabled={busy} className="mt-3 w-full text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40">지금 제출하기</button>
    </div>
  );
}

function ResultPhase({ exam, selections, analysis, reviewParts, onNext }: Readonly<{ exam: MockExamState; selections: (number | null)[]; analysis: ExamAnalysis; reviewParts: { id: string; title: string }[]; onNext: () => void }>): React.ReactElement {
  const a = analysis;
  const scorePct = Math.round(a.rate * 100);
  const deltaPct = abilityPct(a.abilityAfter) - abilityPct(a.abilityBefore);
  return (
    <div className="py-6">
      <div className="rounded-2xl border border-border bg-card p-7 text-center shadow-sm">
        <span className={`inline-grid h-12 w-12 place-items-center rounded-2xl ${a.passed ? BRAND_SOFT : "bg-rose-50 text-rose-600"}`}><Target className="h-6 w-6" aria-hidden="true" /></span>
        <p className="mt-3 text-sm text-muted-foreground">{exam.sessionNo}회차 결과</p>
        <p className={`mt-1 text-5xl font-bold tabular-nums ${a.passed ? "text-brand-primary" : TEXT_ROSE}`}>{scorePct}<span className="text-2xl">점</span></p>
        <p className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${a.passed ? BRAND_SOFT : "bg-rose-50 text-rose-600"}`}>{a.passed ? "합격 기준 통과" : "합격 기준 미달"}</p>
        <p className="mt-2 text-sm tabular-nums text-muted-foreground">{a.total}문항 중 {a.score}문항 정답</p>
        <div className="mt-4 inline-flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
          <span>능력 {abilityPct(a.abilityBefore)}%</span>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span className="font-semibold text-foreground">{abilityPct(a.abilityAfter)}%</span>
          {deltaPct !== 0 ? <span className={deltaPct > 0 ? "text-emerald-600" : TEXT_ROSE}>{deltaPct > 0 ? `+${deltaPct}` : deltaPct}%p</span> : null}
        </div>
      </div>

      <h2 className="mb-3 mt-6 text-sm font-bold">과목별 분석</h2>
      <div className="space-y-2.5">
        {a.bySubject.map((s) => {
          const p = Math.round(s.rate * 100);
          return (
            <div key={s.subject} className="rounded-2xl border border-border bg-card p-3.5">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium">{SUBJECT_MAP[s.subject].label}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{s.correct}/{s.total} · {p}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={`${SUBJECT_MAP[s.subject].label} ${p}%`}>
                <div className={`h-full rounded-full ${p >= PASS_SCORE ? "bg-brand-primary" : "bg-rose-600"}`} style={{ width: `${p}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {a.byDifficulty.length > 0 ? (
        <>
          <h2 className="mb-3 mt-6 text-sm font-bold">난이도별 분석</h2>
          <div className="grid grid-cols-3 gap-2.5">
            {a.byDifficulty.map((d) => {
              const p = Math.round(d.rate * 100);
              return (
                <div key={d.difficulty} className="rounded-2xl border border-border bg-card p-3 text-center">
                  <p className="text-xs text-muted-foreground">{diffLabel(d.difficulty)}</p>
                  <p className="mt-0.5 text-lg font-bold tabular-nums">{p}%</p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">{d.correct}/{d.total}</p>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      <WeakSubjects weak={a.weakSubjects} parts={reviewParts} />

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={onNext} className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 ${STUDY_PRIMARY_BTN}`}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> 다음 회차
        </button>
        <Link href="/mypage/study/wrong-answers" className="flex-1 rounded-xl border border-border px-5 py-3 text-center text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">오답노트 보기</Link>
      </div>

      <ResultExplanations questions={exam.questions} selections={selections} />
    </div>
  );
}

function WeakLinkRow({ href, label, icon }: Readonly<{ href: string; label: string; icon?: React.ReactNode }>): React.ReactElement {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 transition-colors hover:border-brand-primary hover:bg-brand-primary/5 focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {icon}
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}

function WeakSubjects({ weak, parts }: Readonly<{ weak: readonly SubjectKey[]; parts: { id: string; title: string }[] }>): React.ReactElement {
  if (weak.length === 0 && parts.length === 0) {
    return <div className="mt-6 rounded-2xl bg-brand-primary/10 p-4 text-center text-sm font-medium text-brand-primary">모든 과목이 합격선을 넘었습니다. 더 어려운 다음 회차에 도전해 보세요.</div>;
  }
  return (
    <div className="mt-6 space-y-4">
      {weak.length > 0 ? (
        <div>
          <h2 className="mb-1 text-sm font-bold">약점 과목 복습</h2>
          <p className="mb-3 text-xs text-muted-foreground">합격선 미달 과목입니다. 학습 모드로 다시 풀어보세요.</p>
          <div className="space-y-2">
            {weak.map((s) => <WeakLinkRow key={s} href={`/mypage/study/${s}?mode=learn`} label={SUBJECT_MAP[s].label} />)}
          </div>
        </div>
      ) : null}
      {parts.length > 0 ? (
        <div>
          <h2 className="mb-1 text-sm font-bold">교과서로 복습</h2>
          <p className="mb-3 text-xs text-muted-foreground">약점 단원의 이론을 교과서에서 확인하세요.</p>
          <div className="space-y-2">
            {parts.map((p) => <WeakLinkRow key={p.id} href={`/mypage/study/textbook/${p.id}`} label={p.title} icon={<GraduationCap className="h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />} />)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ResultExplanations({ questions, selections }: Readonly<{ questions: Question[]; selections: (number | null)[] }>): React.ReactElement {
  return (
    <>
      <h2 className="mb-3 mt-8 text-sm font-bold">문항별 해설</h2>
      <ol className="space-y-3">
        {questions.map((q, i) => {
          const picked = selections[i];
          const ok = picked === q.answer;
          return (
            <li key={q.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-2.5">
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-white ${ok ? "bg-emerald-600" : "bg-rose-600"}`}>
                  {ok ? <Check className="h-3 w-3" aria-hidden="true" /> : <X className="h-3 w-3" aria-hidden="true" />}
                </span>
                <p className="text-[0.95rem] font-medium leading-relaxed"><span className="mr-1 tabular-nums text-muted-foreground">{i + 1}.</span>{q.question}</p>
              </div>
              <p className="ml-7 mt-2 text-xs text-muted-foreground">
                정답 {q.answer + 1}. {q.choices[q.answer]}
                {picked !== null && !ok ? ` · 내 답 ${picked + 1}. ${q.choices[picked]}` : ""}
                {picked === null ? " · 미응답" : ""}
              </p>
              <p className="ml-7 mt-2 rounded-xl bg-muted p-3 text-[0.9rem] leading-relaxed text-muted-foreground">{q.explanation}</p>
            </li>
          );
        })}
      </ol>
    </>
  );
}
