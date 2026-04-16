// @client-reason: Interactive dashboard with manual trigger, polling, and alert state
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PlayCircle,
  RefreshCw,
  Eye,
  ListOrdered,
  CalendarClock,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface CronStatus {
  total: number;
  publishedCount: number;
  remaining: number;
  progressPct: number;
  lastPublishedAt: string | null;
  nextRunAt: string;
  cronSchedule: string;
  openAiConfigured: boolean;
  cronSecretConfigured: boolean;
  recentArticles: {
    topic_id: number;
    slug: string;
    title: string;
    category: string;
    published_at: string;
    view_count: number;
    reading_time_minutes: number;
  }[];
  upcomingTopics: {
    id: number;
    category: string;
    title: string;
    keyword: string;
  }[];
  categoryBreakdown: {
    category: string;
    total: number;
    published: number;
  }[];
}

type RunResponse =
  | { ok: true; topic_id: number; slug: string; title: string; remaining: number }
  | { ok: true; done: true; message: string }
  | { ok: false; topic_id?: number; error: string };

function formatKst(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeFromNow(iso: string | null): string {
  if (!iso) return "—";
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.floor(abs / 60_000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  const label = (() => {
    if (days > 0) return `${days}일 ${hrs % 24}시간`;
    if (hrs > 0) return `${hrs}시간 ${mins % 60}분`;
    return `${mins}분`;
  })();
  return diff >= 0 ? `${label} 후` : `${label} 전`;
}

function StatusCard({
  icon,
  label,
  value,
  sub,
  tone,
}: Readonly<{
  icon: React.ReactElement;
  label: string;
  value: string | number;
  sub?: string;
  tone?: "ok" | "warn" | "danger";
}>): React.ReactElement {
  const TONE_CLASS: Record<string, string> = {
    warn: "border-amber-500/40",
    danger: "border-red-500/40",
    ok: "border-white/10",
  };
  // eslint-disable-next-line security/detect-object-injection -- tone is a closed literal union
  const toneClass = tone ? TONE_CLASS[tone] : "border-white/10";
  return (
    <div className={`rounded-xl border ${toneClass} bg-white/5 p-4 md:p-5`}>
      <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
        {icon} {label}
      </div>
      <p className="text-2xl font-bold text-white md:text-3xl">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub ? <p className="mt-1.5 text-xs text-zinc-300">{sub}</p> : null}
    </div>
  );
}

function ProgressBar({
  published,
  total,
  pct,
}: Readonly<{ published: number; total: number; pct: number }>): React.ReactElement {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-semibold text-indigo-300">
          <ListOrdered className="h-4 w-4" /> 365일 발행 진행률
        </span>
        <span className="text-white">
          {published.toLocaleString()} / {total.toLocaleString()} ({pct}%)
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        남은 토픽 {(total - published).toLocaleString()}개 · 완료까지 약 {total - published}일
      </p>
    </div>
  );
}

function ConfigAlerts({
  status,
}: Readonly<{ status: CronStatus }>): React.ReactElement | null {
  const missing: string[] = [];
  if (!status.openAiConfigured) missing.push("OPENAI_API_KEY");
  if (!status.cronSecretConfigured) missing.push("CRON_SECRET");
  if (missing.length === 0) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-semibold">환경변수 누락</p>
        <p className="mt-1 text-xs text-red-300">
          다음 변수가 설정되지 않아 크론이 실패합니다: {missing.join(", ")}
        </p>
      </div>
    </div>
  );
}

function TopicRegenerate({
  running,
  onRun,
}: Readonly<{
  running: boolean;
  onRun: (id: number) => void;
}>): React.ReactElement {
  const [topicInput, setTopicInput] = useState("");
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        max={365}
        value={topicInput}
        onChange={(e) => setTopicInput(e.target.value)}
        placeholder="토픽 ID (1-365)"
        className="w-36 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none"
      />
      <button
        type="button"
        disabled={running || !topicInput}
        onClick={() => onRun(Number(topicInput))}
        className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        특정 토픽 재생성
      </button>
    </div>
  );
}

function ManualTrigger({
  onRun,
  running,
  result,
}: Readonly<{
  onRun: (topicId: number | null) => void;
  running: boolean;
  result: RunResponse | null;
}>): React.ReactElement {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-300">
        <PlayCircle className="h-4 w-4" /> 수동 실행
      </h3>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <button
          type="button"
          disabled={running}
          onClick={() => onRun(null)}
          className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
          다음 글 지금 생성
        </button>
        <TopicRegenerate running={running} onRun={(id) => onRun(id)} />
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        OpenAI 호출 → 이미지 선별 → DB 저장 → 캐시 무효화까지 약 20~60초 소요됩니다.
      </p>
      {result ? <ResultBanner result={result} /> : null}
    </div>
  );
}

function ResultBanner({ result }: Readonly<{ result: RunResponse }>): React.ReactElement {
  if ("done" in result) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-indigo-500/15 px-3 py-2 text-xs text-indigo-200">
        <CheckCircle2 className="h-4 w-4" /> {result.message}
      </div>
    );
  }
  if (!result.ok) {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-200">
        <AlertTriangle className="mt-0.5 h-4 w-4" />
        <div>
          실패 {result.topic_id ? `(topic ${result.topic_id})` : ""}: {result.error}
        </div>
      </div>
    );
  }
  return (
    <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs text-emerald-200">
      <CheckCircle2 className="h-4 w-4" />
      생성 성공 — topic {result.topic_id} · {result.title} · 남은 {result.remaining}편
      <Link
        href={`/encyclopedia/${result.slug}`}
        target="_blank"
        rel="noreferrer"
        className="ml-auto flex items-center gap-1 underline hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        보기 <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}

function RecentArticleRow({
  r,
}: Readonly<{ r: CronStatus["recentArticles"][number] }>): React.ReactElement {
  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-white/5 focus-visible:bg-white/5">
      <span className="w-10 text-center text-xs text-zinc-500">{r.topic_id}</span>
      <span className="w-20 shrink-0 truncate text-xs text-fuchsia-300 md:w-24">{r.category}</span>
      <span className="min-w-0 flex-1 truncate font-medium text-white">{r.title}</span>
      <span className="hidden w-28 text-xs text-zinc-400 md:block">
        {formatKst(r.published_at).slice(0, 10)}
      </span>
      <span className="w-16 text-center text-xs text-zinc-400">{r.reading_time_minutes}분</span>
      <span className="flex w-16 items-center justify-center gap-1 text-xs text-zinc-300">
        <Eye className="h-3 w-3" />
        {r.view_count.toLocaleString()}
      </span>
      <Link
        href={`/encyclopedia/${r.slug}`}
        target="_blank"
        rel="noreferrer"
        aria-label="새 창에서 열기"
        className="rounded p-1 text-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function RecentArticles({
  rows,
}: Readonly<{ rows: CronStatus["recentArticles"] }>): React.ReactElement {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-zinc-500">아직 발행된 글이 없습니다</p>;
  }
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-indigo-300">
        <BookOpen className="h-4 w-4" /> 최근 발행 글 ({rows.length})
      </h3>
      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-zinc-400">
          <span className="w-10 text-center">#</span>
          <span className="w-20 md:w-24">카테고리</span>
          <span className="min-w-0 flex-1">제목</span>
          <span className="hidden w-28 md:block">발행일</span>
          <span className="w-16 text-center">읽기</span>
          <span className="w-16 text-center">조회</span>
          <span className="w-10" />
        </div>
        {rows.map((r) => <RecentArticleRow key={r.topic_id} r={r} />)}
      </div>
    </div>
  );
}

function UpcomingList({
  rows,
}: Readonly<{ rows: CronStatus["upcomingTopics"] }>): React.ReactElement {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <p className="text-center text-sm text-zinc-500">모든 토픽이 발행되었습니다 🎉</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-indigo-300">
        <CalendarClock className="h-4 w-4" /> 다음 발행 예정 (상위 10개)
      </h3>
      <ol className="space-y-1 text-sm">
        {rows.map((t, i) => (
          <li
            key={t.id}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors hover:bg-white/5 focus-visible:bg-white/5"
          >
            <span className="w-6 text-center text-xs font-bold text-emerald-400">{i + 1}</span>
            <span className="w-10 text-center text-xs text-zinc-500">#{t.id}</span>
            <span className="w-20 shrink-0 truncate text-xs text-fuchsia-300">{t.category}</span>
            <span className="min-w-0 flex-1 truncate text-white">{t.title}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function CategoryProgress({
  rows,
}: Readonly<{ rows: CronStatus["categoryBreakdown"] }>): React.ReactElement {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-indigo-300">
        <ListOrdered className="h-4 w-4" /> 카테고리별 진행률
      </h3>
      <div className="space-y-2">
        {rows.map((row) => {
          const pct = row.total > 0 ? Math.round((row.published / row.total) * 100) : 0;
          return (
            <div key={row.category} className="flex items-center gap-3 text-sm">
              <span className="w-20 shrink-0 truncate text-xs text-zinc-300">{row.category}</span>
              <div className="flex-1">
                <div className="h-2 w-full rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-indigo-500/80 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <span className="w-16 text-right text-xs text-zinc-400">
                {row.published}/{row.total}
              </span>
              <span className="w-10 text-right text-xs text-white">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KpiGrid({ status }: Readonly<{ status: CronStatus }>): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatusCard
        icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
        label="발행 완료"
        value={status.publishedCount}
        sub={`전체 ${status.total}편 중`}
      />
      <StatusCard
        icon={<ListOrdered className="h-4 w-4 text-indigo-400" />}
        label="남은 글"
        value={status.remaining}
        sub={`약 ${status.remaining}일 소요`}
        tone={status.remaining === 0 ? "ok" : undefined}
      />
      <StatusCard
        icon={<Clock className="h-4 w-4 text-fuchsia-400" />}
        label="다음 자동 실행"
        value={relativeFromNow(status.nextRunAt)}
        sub={formatKst(status.nextRunAt)}
      />
      <StatusCard
        icon={<CalendarClock className="h-4 w-4 text-amber-400" />}
        label="최근 발행"
        value={relativeFromNow(status.lastPublishedAt)}
        sub={formatKst(status.lastPublishedAt)}
      />
    </div>
  );
}

function DashboardHeader({
  loading,
  onRefresh,
}: Readonly<{ loading: boolean; onRefresh: () => void }>): React.ReactElement {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold text-white">
          <BookOpen className="h-5 w-5 text-indigo-400" /> 백과사전 크론 대시보드
        </h1>
        <p className="mt-0.5 text-xs text-zinc-500">
          매일 자동 발행 · 60초마다 자동 새로고침 · KST 기준
        </p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> 새로고침
      </button>
    </div>
  );
}

function CronFooter({ schedule }: Readonly<{ schedule: string }>): React.ReactElement {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-zinc-400">
      <p>
        <span className="font-semibold text-zinc-300">크론 스케줄:</span> {schedule}
      </p>
      <p className="mt-1">
        <span className="font-semibold text-zinc-300">엔드포인트:</span>{" "}
        <code className="text-indigo-300">/api/cron/encyclopedia-generate</code> (Bearer CRON_SECRET)
      </p>
    </div>
  );
}

function useRunGeneration(refetch: () => void): {
  running: boolean;
  result: RunResponse | null;
  runGeneration: (topicId: number | null) => void;
} {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResponse | null>(null);

  const runGeneration = useCallback(
    async (topicId: number | null) => {
      setRunning(true);
      setResult(null);
      try {
        const res = await fetch("/api/admin/encyclopedia", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(topicId !== null ? { topic_id: topicId } : {}),
        });
        const data = (await res.json()) as RunResponse;
        setResult(data);
        refetch();
      } catch (e) {
        setResult({ ok: false, error: (e as Error).message });
      } finally {
        setRunning(false);
      }
    },
    [refetch],
  );

  return { running, result, runGeneration };
}

function useCronStatus(): {
  status: CronStatus | null;
  loading: boolean;
  refetch: () => void;
} {
  const [status, setStatus] = useState<CronStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/encyclopedia", { cache: "no-store" });
      if (res.ok) setStatus(await res.json() as CronStatus);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
    const interval = setInterval(() => void refetch(), 60_000);
    return () => clearInterval(interval);
  }, [refetch]);

  return { status, loading, refetch };
}

export default function EncyclopediaAdminPage(): React.ReactElement {
  const { status, loading, refetch } = useCronStatus();
  const { running, result, runGeneration } = useRunGeneration(refetch);

  if (loading && !status) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!status) {
    return <p className="py-20 text-center text-sm text-zinc-500">데이터를 불러올 수 없습니다</p>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <DashboardHeader loading={loading} onRefresh={() => void refetch()} />
      <ConfigAlerts status={status} />
      <KpiGrid status={status} />
      <ProgressBar
        published={status.publishedCount}
        total={status.total}
        pct={status.progressPct}
      />
      <ManualTrigger onRun={runGeneration} running={running} result={result} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentArticles rows={status.recentArticles} />
        </div>
        <UpcomingList rows={status.upcomingTopics} />
      </div>
      <CategoryProgress rows={status.categoryBreakdown} />
      <CronFooter schedule={status.cronSchedule} />
    </div>
  );
}
