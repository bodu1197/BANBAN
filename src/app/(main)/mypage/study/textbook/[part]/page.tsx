import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowRight, ChevronLeft, ListChecks } from "lucide-react";
import { getUser } from "@/lib/supabase/auth";
import { CURRICULUM, getPart } from "@/data/study/curriculum";
import { TextbookChapter } from "@/components/study/TextbookChapter";
import { STUDY_PRIMARY_BTN } from "@/components/study/study-styles";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ part: string }> }>): Promise<Metadata> {
  const { part } = await params;
  const p = getPart(part);
  return {
    title: p ? `PART ${p.no}. ${p.title} | 교과서` : "교과서 | 문신사 공부방",
    description: p?.summary,
    robots: { index: false },
  };
}

export default async function TextbookPartPage({ params }: Readonly<{ params: Promise<{ part: string }> }>): Promise<React.ReactElement> {
  const user = await getUser();
  if (!user) redirect("/login");
  const { part } = await params;
  const p = getPart(part);
  if (!p) notFound();

  const idx = CURRICULUM.findIndex((c) => c.id === p.id);
  const prev = idx > 0 ? CURRICULUM.at(idx - 1) : undefined;
  const next = CURRICULUM.at(idx + 1);

  return (
    <div className="py-5">
      <nav className="mb-3 text-xs text-muted-foreground">
        <Link href="/mypage/study/textbook" className="transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">교과서 목차</Link> · PART {p.no}
      </nav>
      <h1 className="text-xl font-bold">PART {p.no}. {p.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{p.summary}</p>

      <Link href={`/mypage/study/search?part=${p.id}`} className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:border-brand-primary focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ListChecks className="h-4 w-4 text-brand-primary" aria-hidden="true" /> 이 단원 예상문제 풀기
      </Link>

      <nav className="mt-5 rounded-2xl border border-border bg-card p-4" aria-label="단원 목차">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">목차</p>
        <ol className="space-y-1">
          {p.chapters.map((c, i) => (
            <li key={c.heading}><a href={`#ch-${i + 1}`} className="text-sm text-muted-foreground transition-colors hover:text-brand-primary focus-visible:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{i + 1}. {c.heading}</a></li>
          ))}
        </ol>
      </nav>

      <div className="mt-6 space-y-8">
        {p.chapters.map((c, i) => <TextbookChapter key={c.heading} chapter={c} index={i + 1} />)}
      </div>

      <div className="mt-8 flex items-center gap-2.5">
        {prev ? (
          <Link href={`/mypage/study/textbook/${prev.id}`} className="inline-flex items-center gap-1 rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> 이전
          </Link>
        ) : null}
        {next ? (
          <Link href={`/mypage/study/textbook/${next.id}`} className={`inline-flex flex-1 items-center justify-center gap-1.5 px-4 py-3 ${STUDY_PRIMARY_BTN}`}>PART {next.no}. {next.title} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        ) : (
          <Link href="/mypage/study/textbook" className="flex-1 rounded-xl border border-border px-4 py-3 text-center text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">교과서 목차로</Link>
        )}
      </div>
    </div>
  );
}
