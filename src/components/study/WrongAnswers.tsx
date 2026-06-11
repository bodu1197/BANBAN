// @client-reason: 오답 목록 + 복습 진입(ReviewFlow) 토글
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { SUBJECT_MAP, type Question } from "@/data/study/question-types";
import { ReviewFlow } from "@/components/study/ReviewFlow";
import { subjectGlyph } from "@/components/study/subject-icon";
import { STUDY_PRIMARY_BTN } from "@/components/study/study-styles";

export function WrongAnswers({ questions }: Readonly<{ questions: Question[] }>): React.ReactElement {
  const router = useRouter();
  const [reviewing, setReviewing] = useState(false);

  function exit(): void {
    setReviewing(false);
    router.refresh(); // 복습 중 기록 반영 → 서버 재페치
  }

  if (reviewing) return <ReviewFlow questions={questions} onExit={exit} title="오답 복습" />;
  if (questions.length === 0) return <WrongEmpty />;

  return (
    <div className="py-4">
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3.5">
        <p className="text-sm text-foreground">현재 <b className="text-rose-600">{questions.length}개</b>의 오답이 있습니다.</p>
        <button type="button" onClick={() => setReviewing(true)} className={`inline-flex shrink-0 items-center gap-1.5 px-4 py-2 ${STUDY_PRIMARY_BTN}`}>
          복습 시작 <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <ul className="space-y-2.5">
        {questions.map((q) => (
          <li key={q.id} className="rounded-2xl border border-border bg-card p-4">
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {subjectGlyph(q.subject, "h-3.5 w-3.5")} {SUBJECT_MAP[q.subject].label}
            </span>
            <p className="text-[0.95rem] font-medium leading-relaxed">{q.question}</p>
            <p className="mt-2 text-xs text-muted-foreground">정답 {q.answer + 1}. {q.choices[q.answer]}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WrongEmpty(): React.ReactElement {
  return (
    <div className="py-4">
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-brand-primary/10 text-brand-primary"><Sparkles className="h-6 w-6" aria-hidden="true" /></span>
        <p className="mt-3 font-semibold">아직 오답이 없습니다</p>
        <p className="mt-1 text-sm text-muted-foreground">문제를 풀면 틀린 문제가 여기에 모입니다.</p>
        <Link href="/mypage/study" className={`mt-5 inline-block px-5 py-2.5 ${STUDY_PRIMARY_BTN}`}>과목별 학습 가기</Link>
      </div>
    </div>
  );
}
