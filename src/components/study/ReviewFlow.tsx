// @client-reason: 복습 플로우 — 로컬 풀이 상태 + Server Action(진도 기록). 오답노트/SRS 복습 공용.
"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { SUBJECT_MAP, type Question } from "@/data/study/question-types";
import { recordStudyAnswer } from "@/lib/actions/study-progress";
import { ChoiceButton, choiceState } from "@/components/study/ChoiceButton";
import { subjectGlyph } from "@/components/study/subject-icon";
import { STUDY_PRIMARY_BTN } from "@/components/study/study-styles";

export function ReviewFlow({ questions, onExit, title = "복습" }: Readonly<{ questions: readonly Question[]; onExit: () => void; title?: string }>): React.ReactElement {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [solvedCorrect, setSolvedCorrect] = useState(0);

  const current = questions[idx];
  const total = questions.length;
  if (!current) return <ReviewDone onExit={onExit} />;

  function select(choice: number): void {
    if (revealed) return;
    const correct = choice === current.answer;
    setSelected(choice);
    setRevealed(true);
    if (correct) setSolvedCorrect((c) => c + 1);
    void recordStudyAnswer(current.id, current.subject, correct, "review").catch(() => {});
  }

  function next(): void {
    if (idx < total - 1) {
      setIdx(idx + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      onExit();
    }
  }

  const correct = selected === current.answer;
  return (
    <div className="py-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs tabular-nums text-muted-foreground">{title} {idx + 1} / {total}</span>
        <button type="button" onClick={onExit} className="text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">그만하기</button>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {subjectGlyph(current.subject, "h-3.5 w-3.5")} {SUBJECT_MAP[current.subject].label}
        </span>
        <p className="mt-3 font-medium leading-relaxed">{current.question}</p>
        <div className="mt-5 space-y-2.5">
          {current.choices.map((choice, ci) => (
            <ChoiceButton key={ci} index={ci} label={choice} state={choiceState(revealed, selected, current.answer, ci)} onClick={() => select(ci)} disabled={revealed} />
          ))}
        </div>
        {revealed ? (
          <div className="mt-5 border-t border-border pt-4">
            <p className={`flex items-center gap-1.5 text-sm font-bold ${correct ? "text-emerald-600" : "text-rose-600"}`}>
              {correct ? <Check className="h-4 w-4" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
              {correct ? "정답입니다" : "오답입니다"}
            </p>
            <p className="mt-2 rounded-xl bg-muted p-3.5 text-[0.95rem] leading-relaxed text-muted-foreground">{current.explanation}</p>
          </div>
        ) : null}
      </div>
      <button type="button" onClick={next} disabled={!revealed}
        className="mt-4 w-full rounded-xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40">
        {idx < total - 1 ? "다음 문제" : `복습 완료 (${solvedCorrect}/${total} 정답)`}
      </button>
    </div>
  );
}

function ReviewDone({ onExit }: Readonly<{ onExit: () => void }>): React.ReactElement {
  return (
    <div className="rounded-2xl border border-border bg-card p-10 text-center">
      <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
        <Check className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="mt-3 font-semibold">복습을 마쳤어요!</p>
      <button type="button" onClick={onExit} className={`mt-5 px-5 py-2.5 ${STUDY_PRIMARY_BTN}`}>돌아가기</button>
    </div>
  );
}
