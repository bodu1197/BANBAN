import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, GraduationCap, Newspaper, BarChart3, ListChecks, BookOpenCheck, Timer, NotebookPen, RotateCcw } from "lucide-react";
import { SUBJECTS, getSubjectCount } from "@/data/study/questions";
import { daysUntilExam } from "@/lib/study/exam";
import { getPublishedNews, type StudyNewsItem } from "@/lib/study-news/store";
import { fmtDate } from "@/lib/study-news/format";

export const metadata: Metadata = {
  title: "문신사 공부방",
  description: "문신사 국가시험 대비 학습 공간. 과목별 문제풀이·실전 모의고사·AI 오답노트·교과서·최신 뉴스를 한곳에서.",
  robots: { index: false }, // 인증 전용 — 색인 제외
};
export const dynamic = "force-dynamic";

// 공부방 메인 랜딩 — nunsinpass 메인 구조(히어로+D-Day → 공개메뉴 → 기능카드 → 최신뉴스 → 일정).
// 실제 학습(과목 허브)은 "공부방 입장" CTA → /mypage/study/learn.
export default async function StudyLandingPage(): Promise<React.ReactElement> {
  const dDay = daysUntilExam();
  const totalQuestions = SUBJECTS.reduce((sum, s) => sum + getSubjectCount(s.key), 0);
  const news = await getPublishedNews(5);

  return (
    <div className="py-5">
      <Hero dDay={dDay} totalQuestions={totalQuestions} />
      <PublicMenu />
      <FeatureCards />
      <StudyNewsTeaser news={news} />
      <Timeline />
    </div>
  );
}

const PUBLIC_MENU = [
  { href: "/mypage/study/textbook", Icon: GraduationCap, label: "교과서" },
  { href: "/study-news", Icon: Newspaper, label: "뉴스" },
  { href: "/mypage/study/stats", Icon: BarChart3, label: "통계" },
  { href: "/mypage/study/checklist", Icon: ListChecks, label: "체크리스트" },
] as const;

const FEATURES = [
  { href: "/mypage/study/learn", Icon: BookOpenCheck, title: "과목별 문제풀이", desc: "위생·법규·색소·해부 전 과목을 학습/시험 모드로. 약한 과목을 집중 공략해 합격선까지." },
  { href: "/mypage/study/mock-exam", Icon: Timer, title: "실전 모의고사", desc: "실제 시험처럼 제한 시간 안에 풀고 자동 채점. 과목별 점수로 합격 가능성을 점검합니다." },
  { href: "/mypage/study/wrong-answers", Icon: NotebookPen, title: "AI 오답노트", desc: "틀린 문제만 자동으로 모아 반복 학습. 약점을 없애 점수를 빠르게 올립니다." },
  { href: "/mypage/study/review", Icon: RotateCcw, title: "간격 반복 복습", desc: "망각 곡선에 맞춰 복습할 문제를 자동 추천. 외운 내용을 장기 기억으로 굳힙니다." },
  { href: "/mypage/study/stats", Icon: BarChart3, title: "학습 통계", desc: "정답률·과목별 진행률을 한눈에. 매일의 학습 흐름을 관리합니다." },
  { href: "/mypage/study/textbook", Icon: GraduationCap, title: "통합 교과서", desc: "국가시험 범위를 단원별 이론으로 정리. 개념부터 탄탄하게 다집니다." },
] as const;

const TIMELINE = [
  { date: "2025.10", label: "문신사법 공포", done: true },
  { date: "2026", label: "시험 준비 기간 · 출제기준 마련", done: true },
  { date: "2027.10", label: "법 시행 · 면허제도 개시", done: false },
  { date: "2027 말", label: "첫 국가시험 시행 예정", done: false },
] as const;

function Hero({ dDay, totalQuestions }: Readonly<{ dDay: number; totalQuestions: number }>): React.ReactElement {
  return (
    <section className="grid items-center gap-6 pb-6 lg:grid-cols-2 lg:gap-10 lg:pb-8">
      <div className="text-center lg:text-left">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" aria-hidden="true" /> 2027 문신사 국가시험 대비
        </span>
        <h1 className="mt-4 text-2xl font-bold leading-snug sm:text-3xl">합격까지 함께,<br /><span className="text-brand-primary">문신사 공부방</span></h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground lg:mx-0">과목별 문제풀이부터 실전 모의고사, AI 오답노트까지. 합격에 필요한 학습을 한 곳에서.</p>
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center lg:justify-start">
          <Link href="/mypage/study/learn" className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">공부방 입장하기 <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          <Link href="/study-news" className="inline-flex items-center justify-center rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold transition-colors hover:border-brand-primary focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">최신 소식 보기</Link>
        </div>
      </div>
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">첫 국가시험까지</p>
            <p className="mt-1 text-5xl font-bold leading-none tabular-nums text-brand-primary">D-{dDay}</p>
            <p className="mt-2 text-xs text-muted-foreground">2027.12 시행 예정 기준</p>
          </div>
          <CalendarDays className="h-7 w-7 text-brand-primary/60" aria-hidden="true" />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-brand-primary/10 p-3.5"><p className="text-xl font-bold tabular-nums text-brand-primary">4</p><p className="mt-0.5 text-xs text-muted-foreground">출제 과목</p></div>
          <div className="rounded-2xl bg-muted p-3.5"><p className="text-xl font-bold tabular-nums">{totalQuestions}</p><p className="mt-0.5 text-xs text-muted-foreground">수록 문항</p></div>
        </div>
      </div>
    </section>
  );
}

function PublicMenu(): React.ReactElement {
  return (
    <section aria-label="공부방 메뉴" className="pb-2">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {PUBLIC_MENU.map(({ href, Icon, label }) => (
          <Link key={href} href={href} className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 py-3.5 transition-all hover:border-brand-primary hover:shadow-sm focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-primary/10 text-brand-primary transition-colors group-hover:bg-brand-primary group-hover:text-white"><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
            <span className="text-sm font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FeatureCards(): React.ReactElement {
  return (
    <section className="py-6">
      <h2 className="text-lg font-bold">이렇게 학습하세요</h2>
      <p className="mt-1 text-sm text-muted-foreground">아래 기능으로 약점을 줄이고 합격에 다가가세요.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ href, Icon, title, desc }) => (
          <Link key={title} href={href} className="group flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-5 transition-all hover:border-brand-primary hover:shadow-sm focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-primary/10 text-brand-primary transition-colors group-hover:bg-brand-primary group-hover:text-white"><Icon className="h-5 w-5" aria-hidden="true" /></span>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function StudyNewsTeaser({ news }: Readonly<{ news: StudyNewsItem[] }>): React.ReactElement | null {
  if (news.length === 0) return null;
  return (
    <section aria-label="최신 뉴스" className="py-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-lg font-bold"><Newspaper className="h-5 w-5 text-brand-primary" aria-hidden="true" /> 최신 뉴스</h2>
        <Link href="/study-news" className="text-xs font-medium text-brand-primary transition-colors hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">전체 보기 →</Link>
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {news.map((n) => (
          <li key={n.slug}>
            <Link href={`/study-news/${n.slug}`} className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-primary/10 text-brand-primary"><Newspaper className="h-[18px] w-[18px]" aria-hidden="true" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{n.title}</p>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{n.summary}</p>
                <span className="mt-1 block text-xs tabular-nums text-muted-foreground sm:hidden">{fmtDate(n.publishedAt)}</span>
              </div>
              <span className="mt-0.5 hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block">{fmtDate(n.publishedAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Timeline(): React.ReactElement {
  return (
    <section aria-label="주요 일정" className="py-6">
      <h2 className="mb-4 text-lg font-bold">주요 일정</h2>
      <div className="rounded-2xl border border-border bg-card p-5">
        <ol className="relative ml-2 border-l border-border">
          {TIMELINE.map((item) => (
            <li key={item.date} className="ml-5 pb-5 last:pb-0">
              <span className={`absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-card ${item.done ? "bg-border" : "bg-brand-primary"}`} aria-hidden="true" />
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
                <span className="w-20 shrink-0 text-xs tabular-nums text-muted-foreground">{item.date}</span>
                <span className={item.done ? "text-sm text-muted-foreground" : "text-sm font-medium"}>{item.label}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
