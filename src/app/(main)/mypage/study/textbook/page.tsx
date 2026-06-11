import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap, ChevronRight } from "lucide-react";
import { getUser } from "@/lib/supabase/auth";
import { CURRICULUM } from "@/data/study/curriculum";

export const metadata: Metadata = { title: "교과서 | 문신사 공부방", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function TextbookPage(): Promise<React.ReactElement> {
  const user = await getUser();
  if (!user) redirect("/login");
  return (
    <div className="py-5">
      <div className="mb-1 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-primary/10 text-brand-primary"><GraduationCap className="h-[18px] w-[18px]" aria-hidden="true" /></span>
        <h1 className="text-xl font-bold">교과서</h1>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">국가시험 범위를 11개 단원으로 정리했습니다.</p>
      <ul className="space-y-2.5">
        {CURRICULUM.map((part) => (
          <li key={part.id}>
            <Link href={`/mypage/study/textbook/${part.id}`} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-brand-primary focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-primary text-sm font-bold text-white">{part.no}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">PART {part.no}. {part.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{part.summary}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{part.chapters.length}개 단원</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
