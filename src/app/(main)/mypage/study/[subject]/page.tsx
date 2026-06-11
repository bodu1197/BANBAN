import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { SUBJECTS, getQuestionsBySubject } from "@/data/study/questions";
import { isValidSubject } from "@/lib/study/progress";
import { getStudyBookmarks } from "@/lib/study/queries";
import { Quiz } from "@/components/study/Quiz";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ subject: string }> }>): Promise<Metadata> {
  const { subject } = await params;
  const meta = SUBJECTS.find((s) => s.key === subject);
  return { title: meta ? `${meta.label} 문제풀이 | 문신사 공부방` : "문신사 공부방", robots: { index: false } };
}

export default async function SubjectQuizPage({ params, searchParams }: Readonly<{
  params: Promise<{ subject: string }>;
  searchParams: Promise<{ mode?: string }>;
}>): Promise<React.ReactElement> {
  const user = await getUser();
  if (!user) redirect("/login");

  const { subject } = await params;
  if (!isValidSubject(subject)) notFound();
  const meta = SUBJECTS.find((s) => s.key === subject);
  if (!meta) notFound();

  const { mode } = await searchParams;
  const [questions, bookmarks] = await Promise.all([
    Promise.resolve(getQuestionsBySubject(subject)),
    getStudyBookmarks(user.id),
  ]);

  return (
    <Quiz
      subject={meta}
      questions={questions}
      initialMode={mode === "test" ? "test" : "learn"}
      initialBookmarks={bookmarks}
    />
  );
}
