import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { getStudyBookmarks } from "@/lib/study/queries";
import { getQuestionById, type Question } from "@/data/study/questions";
import { BookmarksList } from "@/components/study/BookmarksList";

export const metadata: Metadata = { title: "북마크 | 문신사 공부방", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function BookmarksPage(): Promise<React.ReactElement> {
  const user = await getUser();
  if (!user) redirect("/login");
  // 서버에서 id[] → Question[] 해결(클라 번들에 QUESTIONS 미포함).
  const ids = await getStudyBookmarks(user.id);
  const questions = ids.map(getQuestionById).filter((q): q is Question => Boolean(q));
  return (
    <div>
      <h1 className="pt-5 text-xl font-bold">북마크</h1>
      <BookmarksList questions={questions} />
    </div>
  );
}
