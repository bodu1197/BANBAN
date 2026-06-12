// @client-reason: 문제풀이 엔진 — 로컬 풀이 상태 + Server Action(진도 기록)
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, X, RefreshCw, Trophy } from "lucide-react";
import type { Question, SubjectMeta } from "@/data/study/questions";
import { recordStudyAnswer, recordStudyAnswersBatch } from "@/lib/actions/study-progress";
import { BookmarkButton } from "@/components/study/BookmarkButton";
import { ChoiceButton, choiceState } from "@/components/study/ChoiceButton";
import { subjectGlyph } from "@/components/study/subject-icon";

type Mode = "learn" | "test";

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

interface QuizProps {
  subject: SubjectMeta;
  questions: Question[];
  initialMode: Mode;
  initialBookmarks: string[];
}

export function Quiz({ subject, questions, initialMode, initialBookmarks }: Readonly<QuizProps>): React.ReactElement {
  const [mode, setMode] = useState<Mode>(initialMode);
  // SSR/첫 렌더는 원래 순서 → 하이드레이션 불일치(#418) 방지, 마운트 후 셔플.
  const [ordered, setOrdered] = useState<Question[]>(questions);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<(number | null)[]>(() => questions.map(() => null));
  const [revealed, setRevealed] = useState<boolean[]>(() => questions.map(() => false));
  const [finished, setFinished] = useState(false);
  const bookmarkSet = new Set(initialBookmarks);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 후 클라 셔플(SSR 불일치 방지)
    setOrdered((prev) => shuffle(prev));
  }, []);

  const total = ordered.length;
  const current = ordered[idx];

  function restart(nextMode: Mode = mode): void {
    setMode(nextMode);
    setOrdered(shuffle(questions));
    setIdx(0);
    setSelected(questions.map(() => null));
    setRevealed(questions.map(() => false));
    setFinished(false);
  }

  function handleLearnSelect(choice: number): void {
    if (revealed[idx]) return;
    const correct = choice === current.answer;
    setSelected((s) => s.map((v, i) => (i === idx ? choice : v)));
    setRevealed((r) => r.map((v, i) => (i === idx ? true : v)));
    // 백그라운드 기록(논블로킹) — UI 피드백은 이미 로컬 반영.
    void recordStudyAnswer(current.id, current.subject, correct, "quiz").catch(() => {});
  }

  function submitTest(): void {
    const records = ordered.map((q, i) => ({ questionId: q.id, subject: q.subject, isCorrect: selected[i] === q.answer, source: "test" }));
    void recordStudyAnswersBatch(records).catch(() => {});
    setFinished(true);
  }

  const correctCount = ordered.reduce((acc, q, i) => acc + (selected[i] === q.answer ? 1 : 0), 0);
  const scorePct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  if (finished) {
    return <ResultView subject={subject} total={total} correctCount={correctCount} scorePct={scorePct} ordered={ordered} selected={selected} onRestart={() => restart()} />;
  }

  return (
    <div className="py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-primary/10 text-brand-primary">
            {subjectGlyph(subject.key, "h-[19px] w-[19px]")}
          </span>
          <h1 className="text-lg font-bold">{subject.label}</h1>
        </div>
        <ModeToggle mode={mode} onChange={(target) => restart(target)} />
      </div>
      <p className="mb-4 text-xs text-muted-foreground">※ 학습용 예상문제입니다. 실제 국가시험 문제와 다를 수 있습니다.</p>
      <ProgressBar idx={idx} total={total} answeredCount={selected.filter((s) => s !== null).length} showAnswered={mode === "test"} />
      <QuestionCard
        question={current}
        bookmarked={bookmarkSet.has(current.id)}
        showResult={mode === "learn" && revealed[idx]}
        picked={selected[idx]}
        onSelect={(ci) => (mode === "learn" ? handleLearnSelect(ci) : setSelected((s) => s.map((v, i) => (i === idx ? ci : v))))}
        learnLocked={mode === "learn" && revealed[idx]}
      />
      <QuizControls
        mode={mode}
        canGoNext={mode === "test" || revealed[idx]}
        isLast={idx >= total - 1}
        atStart={idx === 0}
        onPrev={() => idx > 0 && setIdx(idx - 1)}
        onNext={() => (idx < total - 1 ? setIdx(idx + 1) : setFinished(true))}
        onSubmit={submitTest}
      />
    </div>
  );
}

function ProgressBar({ idx, total, answeredCount, showAnswered }: Readonly<{ idx: number; total: number; answeredCount: number; showAnswered: boolean }>): React.ReactElement {
  const pct = total > 0 ? ((idx + 1) / total) * 100 : 0;
  return (
    <div className="mb-5">
      <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
        <span className="tabular-nums">{idx + 1} / {total} 문항</span>
        {showAnswered ? <span className="tabular-nums">{answeredCount}개 응답</span> : null}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-brand-primary transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function QuestionCard({ question, bookmarked, showResult, picked, onSelect, learnLocked }: Readonly<{
  question: Question; bookmarked: boolean; showResult: boolean; picked: number | null; onSelect: (ci: number) => void; learnLocked: boolean;
}>): React.ReactElement {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium leading-relaxed">{question.question}</p>
        <BookmarkButton id={question.id} initialOn={bookmarked} />
      </div>
      <div className="mt-5 space-y-2.5">
        {question.choices.map((choice, ci) => (
          <ChoiceButton
            key={ci}
            index={ci}
            label={choice}
            state={choiceState(showResult, picked, question.answer, ci)}
            onClick={() => onSelect(ci)}
            disabled={learnLocked}
          />
        ))}
      </div>
      {showResult ? <Explanation correct={picked === question.answer} text={question.explanation} /> : null}
    </div>
  );
}

function QuizControls({ mode, canGoNext, isLast, atStart, onPrev, onNext, onSubmit }: Readonly<{
  mode: Mode; canGoNext: boolean; isLast: boolean; atStart: boolean; onPrev: () => void; onNext: () => void; onSubmit: () => void;
}>): React.ReactElement {
  const primaryBtn = "flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40";
  const showSubmit = mode === "test" && isLast;
  return (
    <div className="mt-4 flex items-center gap-2.5">
      <button type="button" onClick={onPrev} disabled={atStart}
        className="rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40">
        이전
      </button>
      {showSubmit ? (
        <button type="button" onClick={onSubmit} className={`${primaryBtn} bg-emerald-600 hover:bg-emerald-700 focus-visible:bg-emerald-700`}>제출하고 채점</button>
      ) : (
        <button type="button" onClick={onNext} disabled={!canGoNext} className={`${primaryBtn} bg-brand-primary hover:bg-brand-primary-hover focus-visible:bg-brand-primary-hover`}>
          {isLast ? "결과 보기" : "다음 문제"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function Explanation({ correct, text }: Readonly<{ correct: boolean; text: string }>): React.ReactElement {
  return (
    <div className="mt-5 border-t border-border pt-4">
      <p className={`flex items-center gap-1.5 text-sm font-bold ${correct ? "text-emerald-600" : "text-rose-600"}`}>
        {correct ? <Check className="h-4 w-4" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
        {correct ? "정답입니다" : "오답입니다"}
      </p>
      <p className="mt-2 rounded-xl bg-muted p-3.5 text-[0.95rem] leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function ModeToggle({ mode, onChange }: Readonly<{ mode: Mode; onChange: (m: Mode) => void }>): React.ReactElement {
  return (
    <div className="inline-flex rounded-xl border border-border bg-muted p-0.5 text-xs">
      {(["learn", "test"] as Mode[]).map((target) => (
        <button key={target} type="button" onClick={() => onChange(target)} aria-pressed={mode === target}
          className={`rounded-lg px-3 py-1.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            mode === target ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}>
          {target === "learn" ? "학습 모드" : "시험 모드"}
        </button>
      ))}
    </div>
  );
}

function ResultView({ subject, total, correctCount, scorePct, ordered, selected, onRestart }: Readonly<{
  subject: SubjectMeta; total: number; correctCount: number; scorePct: number; ordered: Question[]; selected: (number | null)[]; onRestart: () => void;
}>): React.ReactElement {
  const pass = scorePct >= 60; // 국가시험 합격선 60점
  return (
    <div className="py-4">
      <div className="rounded-2xl border border-border bg-card p-7 text-center shadow-sm">
        <span className={`inline-grid h-12 w-12 place-items-center rounded-2xl ${pass ? "bg-brand-primary/10 text-brand-primary" : "bg-rose-50 text-rose-600"}`}>
          <Trophy className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm text-muted-foreground">{subject.label} 결과</p>
        <p className={`mt-1 text-5xl font-bold tabular-nums ${pass ? "text-brand-primary" : "text-rose-600"}`}>
          {scorePct}<span className="text-2xl">점</span>
        </p>
        <p className="mt-1 text-sm tabular-nums text-muted-foreground">{total}문항 중 {correctCount}문항 정답</p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <button type="button" onClick={onRestart}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> 다시 풀기
          </button>
          <Link href="/mypage/study/learn"
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            과목 목록
          </Link>
        </div>
      </div>
      <h2 className="mb-3 mt-8 text-sm font-bold">문항별 해설</h2>
      <ol className="space-y-3">
        {ordered.map((q, i) => <ReviewCard key={q.id} index={i} question={q} picked={selected[i]} />)}
      </ol>
    </div>
  );
}

function ReviewCard({ index, question, picked }: Readonly<{ index: number; question: Question; picked: number | null }>): React.ReactElement {
  const ok = picked === question.answer;
  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-2.5">
        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-white ${ok ? "bg-emerald-600" : "bg-rose-600"}`}>
          {ok ? <Check className="h-3 w-3" aria-hidden="true" /> : <X className="h-3 w-3" aria-hidden="true" />}
        </span>
        <p className="text-[0.95rem] font-medium leading-relaxed">
          <span className="mr-1 tabular-nums text-muted-foreground">{index + 1}.</span>{question.question}
        </p>
      </div>
      <p className="ml-7 mt-2 text-xs text-muted-foreground">
        정답 {question.answer + 1}. {question.choices[question.answer]}
        {picked !== null && !ok ? ` · 내 답 ${picked + 1}. ${question.choices[picked]}` : ""}
        {picked === null ? " · 미응답" : ""}
      </p>
      <p className="ml-7 mt-2 rounded-xl bg-muted p-3 text-[0.9rem] leading-relaxed text-muted-foreground">{question.explanation}</p>
    </li>
  );
}
