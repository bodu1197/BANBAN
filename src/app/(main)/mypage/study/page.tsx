import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpenCheck, Pencil, BarChart3, RotateCcw, NotebookPen, Timer, Bookmark, CalendarDays, BookText, ListChecks, Search, Layers, GraduationCap, ChevronRight, Newspaper } from "lucide-react";
import { getUser } from "@/lib/supabase/auth";
import { SUBJECTS, getSubjectCount, type SubjectMeta } from "@/data/study/questions";
import { getStudyAnswers } from "@/lib/study/queries";
import { computeStats, type SubjectStat } from "@/lib/study/progress";
import { computeReview } from "@/lib/study/srs";
import { daysUntilExam } from "@/lib/study/exam";
import { CURRICULUM } from "@/data/study/curriculum";
import { getPublishedNews } from "@/lib/study-news/store";
import { subjectGlyph } from "@/components/study/subject-icon";
import { StudyNewsRow } from "@/components/study/StudyNewsRow";

export const metadata: Metadata = {
  title: "문신사 공부방",
  description: "위생·감염, 법규·면허, 색소·재료, 기초 해부 과목별 문제풀이로 문신사 국가시험을 준비하세요.",
  robots: { index: false }, // 인증 전용(1인 진도) — 색인 제외(중복/소프트404 방지)
};
export const dynamic = "force-dynamic";

export default async function StudyHomePage(): Promise<React.ReactElement> {
  const user = await getUser();
  if (!user) redirect("/login");
  const [answers, news] = await Promise.all([getStudyAnswers(user.id), getPublishedNews(5)]);
  const stats = computeStats(answers);
  const review = computeReview(answers);
  const statBySubject = new Map(stats.bySubject.map((s) => [s.subject, s]));
  const dDay = daysUntilExam();

  return (
    <div className="py-5">
      <h1 className="mb-1 text-xl font-bold">문신사 공부방</h1>
      <p className="mb-4 text-sm text-muted-foreground">이론부터 시험까지, 합격 한 곳에서.</p>

      {/* D-Day 배너 (텍스트는 풀 흰색 — brand-primary 위 AA 대비 확보; 투명도는 장식 아이콘만) */}
      <section aria-label="국가시험 일정" className="mb-4 flex items-center justify-between rounded-2xl bg-brand-primary px-5 py-4 text-white">
        <div>
          <p className="text-xs text-white">첫 국가시험까지</p>
          <p className="text-2xl font-bold tabular-nums">D-{dDay}</p>
        </div>
        <div className="text-right">
          <CalendarDays className="ml-auto h-7 w-7 text-white/80" aria-hidden="true" />
          <p className="mt-0.5 text-[11px] text-white">2027.12 시행 예정</p>
        </div>
      </section>

      {/* 교과서 전면 진입 */}
      <Link href="/mypage/study/textbook" className="mb-5 flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-brand-primary focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-primary/10 text-brand-primary"><GraduationCap className="h-6 w-6" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">교과서로 이론부터</p>
          <p className="mt-0.5 text-sm text-muted-foreground">국가시험 범위를 {CURRICULUM.length}개 단원으로 정리했어요.</p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>

      <div className="mb-5 grid grid-cols-3 gap-2.5">
        <SummaryCell label="푼 문제" value={`${stats.totalAttempts}`} />
        <SummaryCell label="정답률" value={`${stats.correctRate}%`} />
        <SummaryCell label="오늘" value={`${stats.solvedToday}`} />
      </div>

      <div className="mb-5 space-y-3">
        <div role="group" aria-label="복습·평가">
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">복습·평가</p>
          <div className="flex flex-wrap gap-2">
            <StudyChip href="/mypage/study/mock-exam" label="모의고사"><Timer className="h-4 w-4" aria-hidden="true" /></StudyChip>
            <StudyChip href="/mypage/study/stats" label="통계"><BarChart3 className="h-4 w-4" aria-hidden="true" /></StudyChip>
            <StudyChip href="/mypage/study/review" label="복습" badge={review.dueCount}><RotateCcw className="h-4 w-4" aria-hidden="true" /></StudyChip>
            <StudyChip href="/mypage/study/wrong-answers" label="오답노트" badge={stats.wrongQuestionIds.length}><NotebookPen className="h-4 w-4" aria-hidden="true" /></StudyChip>
            <StudyChip href="/mypage/study/bookmarks" label="북마크"><Bookmark className="h-4 w-4" aria-hidden="true" /></StudyChip>
          </div>
        </div>
        <div role="group" aria-label="학습 도구">
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">학습 도구</p>
          <div className="flex flex-wrap gap-2">
            <StudyChip href="/mypage/study/search" label="검색"><Search className="h-4 w-4" aria-hidden="true" /></StudyChip>
            <StudyChip href="/mypage/study/flashcards" label="카드"><Layers className="h-4 w-4" aria-hidden="true" /></StudyChip>
            <StudyChip href="/mypage/study/planner" label="플래너"><CalendarDays className="h-4 w-4" aria-hidden="true" /></StudyChip>
            <StudyChip href="/mypage/study/glossary" label="용어집"><BookText className="h-4 w-4" aria-hidden="true" /></StudyChip>
            <StudyChip href="/mypage/study/checklist" label="체크리스트"><ListChecks className="h-4 w-4" aria-hidden="true" /></StudyChip>
          </div>
        </div>
      </div>

      {news.length > 0 ? (
        <section aria-label="최신 뉴스" className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-bold"><Newspaper className="h-4 w-4 text-brand-primary" aria-hidden="true" /> 최신 뉴스</h2>
            <Link href="/study-news" className="text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">전체 보기 →</Link>
          </div>
          <ul className="space-y-2">
            {news.map((n) => <StudyNewsRow key={n.slug} item={n} compact />)}
          </ul>
        </section>
      ) : null}

      <div className="space-y-3">
        {SUBJECTS.map((s) => <SubjectCard key={s.key} subject={s} stat={statBySubject.get(s.key)} />)}
      </div>
    </div>
  );
}

function SummaryCell({ label, value }: Readonly<{ label: string; value: string }>): React.ReactElement {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3 text-center shadow-sm">
      <p className="text-lg font-bold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function StudyChip({ href, label, badge, children }: Readonly<{ href: string; label: string; badge?: number; children: React.ReactNode }>): React.ReactElement {
  return (
    <Link
      href={href}
      aria-label={badge !== undefined && badge > 0 ? `${label} ${badge}개` : label}
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-brand-primary hover:text-foreground focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
      {label}
      {badge !== undefined && badge > 0 ? (
        <span className="ml-0.5 rounded-full bg-brand-primary px-1.5 text-xs font-bold tabular-nums text-white">{badge}</span>
      ) : null}
    </Link>
  );
}

function SubjectCard({ subject, stat }: Readonly<{ subject: SubjectMeta; stat: SubjectStat | undefined }>): React.ReactElement {
  const total = getSubjectCount(subject.key);
  const attempted = stat?.attempted ?? 0;
  const tab = "flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-primary/10 text-brand-primary">
          {subjectGlyph(subject.key, "h-[22px] w-[22px]")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{subject.label}</p>
          <p className="truncate text-sm text-muted-foreground">{subject.desc}</p>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{attempted}/{total}</span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
        <Link href={`/mypage/study/${subject.key}?mode=learn`} className={tab}>
          <BookOpenCheck className="h-4 w-4" aria-hidden="true" /> 학습 모드
        </Link>
        <Link href={`/mypage/study/${subject.key}?mode=test`} className={tab}>
          <Pencil className="h-4 w-4" aria-hidden="true" /> 시험 모드
        </Link>
      </div>
    </article>
  );
}
