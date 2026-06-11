import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Layers } from "lucide-react";
import { getUser } from "@/lib/supabase/auth";
import { getStudyBookmarks } from "@/lib/study/queries";
import { QUESTIONS } from "@/data/study/questions";
import { Flashcards, type FlashCard } from "@/components/study/Flashcards";

export const metadata: Metadata = { title: "플래시카드 | 문신사 공부방", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function FlashcardsPage(): Promise<React.ReactElement> {
  const user = await getUser();
  if (!user) redirect("/login");
  // 전체 코퍼스를 렌더 필드만 추려 1회 전달(미사용 필드 직렬화 방지). 북마크/과목 풀은 클라에서 파생.
  const allCards: FlashCard[] = QUESTIONS.map((q) => ({ id: q.id, subject: q.subject, question: q.question, choices: q.choices, answer: q.answer, explanation: q.explanation }));
  const bookmarkIds = await getStudyBookmarks(user.id);
  return (
    <div>
      <div className="flex items-center gap-2.5 pt-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-primary/10 text-brand-primary"><Layers className="h-[18px] w-[18px]" aria-hidden="true" /></span>
        <h1 className="text-xl font-bold">플래시카드</h1>
      </div>
      <div className="py-4">
        <Flashcards allCards={allCards} bookmarkIds={bookmarkIds} />
      </div>
    </div>
  );
}
