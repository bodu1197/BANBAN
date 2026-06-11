import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { getUser } from "@/lib/supabase/auth";
import { getStudyBookmarks } from "@/lib/study/queries";
import { QUESTIONS, SUBJECT_TO_PARTS, getDifficulty } from "@/data/study/questions";
import { SUBJECTS, type SubjectKey } from "@/data/study/question-types";
import { SearchView, type SearchDoc } from "@/components/study/search-view";

export const metadata: Metadata = { title: "문제 검색 | 문신사 공부방", robots: { index: false } };
export const dynamic = "force-dynamic";

// 교과서 PART id → 관련 과목(SUBJECT_TO_PARTS 역매핑). 서버 수행(클라 SUBJECT_TO_PARTS 미import).
function subjectsForPart(part: string): SubjectKey[] {
  return (Object.entries(SUBJECT_TO_PARTS) as [SubjectKey, string[]][])
    .filter(([, parts]) => parts.includes(part))
    .map(([s]) => s);
}

function resolveInitialSubjects(subject: string, part: string): SubjectKey[] {
  const valid = SUBJECTS.find((s) => s.key === subject)?.key;
  if (valid) return [valid];
  if (part) return subjectsForPart(part);
  return [];
}

export default async function SearchPage({ searchParams }: Readonly<{ searchParams: Promise<{ subject?: string; part?: string }> }>): Promise<React.ReactElement> {
  const user = await getUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const part = sp.part ?? "";
  const subject = sp.subject ?? "";
  const initialSubjects = resolveInitialSubjects(subject, part);
  const fromPart = Boolean(part) && initialSubjects.length > 0 && !SUBJECTS.some((s) => s.key === subject);

  // 서버에서 렌더 필드만 추린 경량 SearchDoc[](difficulty 사전적용). 클라가 QUESTIONS 모듈 미번들.
  const docs: SearchDoc[] = QUESTIONS.map((q) => ({
    id: q.id, subject: q.subject, difficulty: getDifficulty(q.id), question: q.question, choices: q.choices, answer: q.answer, explanation: q.explanation,
  }));
  const bookmarkIds = await getStudyBookmarks(user.id);

  return (
    <div>
      <div className="flex items-center gap-2.5 pt-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-primary/10 text-brand-primary"><SearchIcon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
        <h1 className="text-xl font-bold">문제 검색</h1>
      </div>
      <div className="py-4">
        <SearchView docs={docs} initialSubjects={initialSubjects} bookmarkIds={bookmarkIds} fromPart={fromPart} />
      </div>
    </div>
  );
}
