// @client-reason: 복습 대기 안내 + 복습 진입(ReviewFlow) 토글
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, RefreshCw } from "lucide-react";
import type { Question } from "@/data/study/question-types";
import { ReviewFlow } from "@/components/study/ReviewFlow";
import { STUDY_PRIMARY_BTN } from "@/components/study/study-styles";
import type { ReviewInfo } from "@/lib/study/srs";

function reviewEmptySub(info: Readonly<ReviewInfo>): string {
  if (info.tracked === 0) return "문제를 풀면 복습 일정이 자동으로 잡힙니다.";
  if (info.nextDueInDays !== null) return `다음 복습 예정: 약 ${info.nextDueInDays}일 후`;
  return "복습 일정을 계산 중입니다.";
}

export function Review({ info, dueQuestions }: Readonly<{ info: ReviewInfo; dueQuestions: Question[] }>): React.ReactElement {
  const router = useRouter();
  const [reviewing, setReviewing] = useState(false);

  function exit(): void {
    setReviewing(false);
    router.refresh();
  }

  if (reviewing) return <ReviewFlow questions={dueQuestions} onExit={exit} title="복습" />;
  if (info.dueCount === 0) {
    return (
      <div className="py-4">
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><RefreshCw className="h-6 w-6" aria-hidden="true" /></span>
          <p className="mt-3 font-semibold">지금 복습할 문제가 없습니다</p>
          <p className="mt-1 text-sm text-muted-foreground">{reviewEmptySub(info)}</p>
          <Link href="/mypage/study" className={`mt-5 inline-block px-5 py-2.5 ${STUDY_PRIMARY_BTN}`}>과목별 학습 가기</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">오늘 복습할 문제</p>
        <p className="mt-1 text-4xl font-bold tabular-nums text-brand-primary">{info.dueCount}<span className="text-xl">문제</span></p>
        <p className="mt-2 text-xs text-muted-foreground">간격 반복(스페이스드 리피티션)으로 약점을 장기 기억으로 굳힙니다.</p>
        <button type="button" onClick={() => setReviewing(true)} className={`mt-5 inline-flex items-center gap-1.5 px-6 py-3 ${STUDY_PRIMARY_BTN}`}>
          복습 시작 <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
