// @client-reason: 북마크 해제 optimistic + Server Action(toggleStudyBookmark)
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, X } from "lucide-react";
import { SUBJECT_MAP, type Question } from "@/data/study/question-types";
import { toggleStudyBookmark } from "@/lib/actions/study-progress";
import { subjectGlyph } from "@/components/study/subject-icon";
import { STUDY_PRIMARY_BTN } from "@/components/study/study-styles";

export function BookmarksList({ questions }: Readonly<{ questions: Question[] }>): React.ReactElement {
  const router = useRouter();
  const [items, setItems] = useState(questions);
  const [, startTransition] = useTransition();

  function remove(id: string): void {
    const removed = items.find((q) => q.id === id);
    setItems((list) => list.filter((q) => q.id !== id)); // optimistic
    startTransition(async () => {
      const res = await toggleStudyBookmark(id);
      if (!res.success && removed) {
        setItems((list) => [...list, removed]); // 함수형 재삽입(동시 해제 경합 안전)
        router.refresh(); // 서버 기준 순서 정정
      }
    });
  }

  if (items.length === 0) return <BookmarksEmpty />;

  return (
    <ul className="space-y-2.5 py-4">
      {items.map((q) => (
        <li key={q.id} className="relative rounded-2xl border border-border bg-card p-4">
          <button type="button" onClick={() => remove(q.id)} aria-label="북마크 해제" className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{subjectGlyph(q.subject, "h-3.5 w-3.5")} {SUBJECT_MAP[q.subject].label}</span>
          <p className="pr-8 text-[0.95rem] font-medium leading-relaxed">{q.question}</p>
          <p className="mt-2 text-xs text-muted-foreground">정답 {q.answer + 1}. {q.choices[q.answer]}</p>
          <p className="mt-2 rounded-xl bg-muted p-3 text-[0.9rem] leading-relaxed text-muted-foreground">{q.explanation}</p>
        </li>
      ))}
    </ul>
  );
}

function BookmarksEmpty(): React.ReactElement {
  return (
    <div className="py-4">
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-brand-primary/10 text-brand-primary"><Bookmark className="h-6 w-6" aria-hidden="true" /></span>
        <p className="mt-3 font-semibold">아직 북마크한 문제가 없습니다</p>
        <p className="mt-1 text-sm text-muted-foreground">문제 풀이 중 북마크 버튼으로 저장하세요.</p>
        <Link href="/mypage/study" className={`mt-5 inline-block px-5 py-2.5 ${STUDY_PRIMARY_BTN}`}>과목별 학습 가기</Link>
      </div>
    </div>
  );
}
