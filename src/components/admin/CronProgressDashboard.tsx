// @client-reason: interactive dashboard with polling, manual trigger, and live result banner
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
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
  BookOpen,
} from "lucide-react";
import type { GenericCronStatus, GenericRunResult } from "@/lib/cron-jobs/types";

export interface CronProgressDashboardProps {
  feature: string;
  statusUrl: string;       // GET endpoint
  runUrl: string;          // POST endpoint
  acceptsItemId?: boolean; // show "특정 항목 재생성" input?
  itemIdLabel?: string;
}

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
}: Readonly<{
  icon: React.ReactElement;
  label: string;
  value: string | number;
  sub?: string;
}>): React.ReactElement {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:p-5">
      <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">{icon} {label}</div>
      <p className="text-2xl font-bold text-white md:text-3xl">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub ? <p className="mt-1.5 text-xs text-zinc-300">{sub}</p> : null}
    </div>
  );
}

function ConfigAlerts({ status }: Readonly<{ status: GenericCronStatus }>): React.ReactElement | null {
  const missing = status.envOk.filter((e) => !e.ok).map((e) => e.name);
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

function ProgressBar({
  status,
}: Readonly<{ status: GenericCronStatus }>): React.ReactElement | null {
  if (status.total === null || status.progressPct === null) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-semibold text-indigo-300">
          <ListOrdered className="h-4 w-4" /> 진행률
        </span>
        <span className="text-white">
          {status.doneCount.toLocaleString()} / {status.total.toLocaleString()} ({status.progressPct}%)
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all"
          style={{ width: `${Math.min(100, status.progressPct)}%` }}
        />
      </div>
      {status.remaining !== null ? (
        <p className="mt-2 text-xs text-zinc-400">
          남은 항목 {status.remaining.toLocaleString()}개
        </p>
      ) : null}
    </div>
  );
}

function ManualTrigger({
  onRun,
  running,
  result,
  acceptsItemId,
  itemIdLabel,
}: Readonly<{
  onRun: (id: string | null) => void;
  running: boolean;
  result: GenericRunResult | null;
  acceptsItemId: boolean;
  itemIdLabel: string;
}>): React.ReactElement {
  const [itemInput, setItemInput] = useState("");
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
          다음 항목 지금 생성
        </button>
        {acceptsItemId ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={itemInput}
              onChange={(e) => setItemInput(e.target.value)}
              placeholder={itemIdLabel}
              className="w-56 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none"
            />
            <button
              type="button"
              disabled={running || !itemInput}
              onClick={() => onRun(itemInput)}
              className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              특정 항목 재생성
            </button>
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        OpenAI 호출 → 이미지/메타 선별 → DB 저장 → 캐시 무효화. 약 20~60초 소요됩니다.
      </p>
      {result ? <ResultBanner result={result} /> : null}
    </div>
  );
}

function ResultBanner({ result }: Readonly<{ result: GenericRunResult }>): React.ReactElement {
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
        실패: {result.error}
      </div>
    );
  }
  return (
    <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs text-emerald-200">
      <CheckCircle2 className="h-4 w-4" />
      생성 성공 — {result.title}
      {result.remaining !== null ? ` · 남은 ${result.remaining}` : ""}
      {result.href ? (
        <Link
          href={result.href}
          target="_blank"
          rel="noreferrer"
          className="ml-auto flex items-center gap-1 underline hover:text-white"
        >
          보기 <ExternalLink className="h-3 w-3" />
        </Link>
      ) : null}
    </div>
  );
}

function RecentRow({
  r,
}: Readonly<{ r: GenericCronStatus["recentItems"][number] }>): React.ReactElement {
  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-white/5">
      {r.category ? (
        <span className="w-24 shrink-0 truncate text-xs text-fuchsia-300">{r.category}</span>
      ) : null}
      <span className="min-w-0 flex-1 truncate font-medium text-white">{r.title}</span>
      <span className="hidden w-28 text-xs text-zinc-400 md:block">
        {formatKst(r.publishedAt).slice(0, 10)}
      </span>
      {r.viewCount !== null ? (
        <span className="flex w-16 items-center justify-center gap-1 text-xs text-zinc-300">
          <Eye className="h-3 w-3" />
          {r.viewCount.toLocaleString()}
        </span>
      ) : null}
      {r.href ? (
        <Link
          href={r.href}
          target="_blank"
          rel="noreferrer"
          aria-label="새 창에서 열기"
          className="rounded p-1 text-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

function RecentList({
  rows,
}: Readonly<{ rows: GenericCronStatus["recentItems"] }>): React.ReactElement {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-zinc-500">아직 생성된 항목이 없습니다</p>;
  }
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-indigo-300">
        <BookOpen className="h-4 w-4" /> 최근 생성 ({rows.length})
      </h3>
      <div className="space-y-1 text-sm">
        {rows.map((r) => <RecentRow key={r.id} r={r} />)}
      </div>
    </div>
  );
}

function UpcomingList({
  rows,
}: Readonly<{ rows: GenericCronStatus["upcomingItems"] }>): React.ReactElement | null {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-indigo-300">
        <CalendarClock className="h-4 w-4" /> 다음 생성 예정
      </h3>
      <ol className="space-y-1 text-sm">
        {rows.map((t, i) => (
          <li
            key={t.id}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors hover:bg-white/5"
          >
            <span className="w-6 text-center text-xs font-bold text-emerald-400">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-white">{t.label}</span>
            {t.sub ? <span className="hidden text-xs text-zinc-500 md:block">{t.sub}</span> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function CategoryProgress({
  rows,
}: Readonly<{ rows: GenericCronStatus["categoryBreakdown"] }>): React.ReactElement | null {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-indigo-300">
        <ListOrdered className="h-4 w-4" /> 카테고리별 진행률
      </h3>
      <div className="space-y-2">
        {rows.map((row) => {
          const pct = row.total > 0 ? Math.round((row.done / row.total) * 100) : 0;
          return (
            <div key={row.category} className="flex items-center gap-3 text-sm">
              <span className="w-24 shrink-0 truncate text-xs text-zinc-300">{row.category}</span>
              <div className="flex-1">
                <div className="h-2 w-full rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-indigo-500/80 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <span className="w-16 text-right text-xs text-zinc-400">
                {row.done}/{row.total}
              </span>
              <span className="w-10 text-right text-xs text-white">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KpiGrid({ status }: Readonly<{ status: GenericCronStatus }>): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatusCard
        icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
        label="생성 완료"
        value={status.doneCount}
        sub={status.total !== null ? `전체 ${status.total.toLocaleString()}편 중` : undefined}
      />
      <StatusCard
        icon={<ListOrdered className="h-4 w-4 text-indigo-400" />}
        label="남은 항목"
        value={status.remaining !== null ? status.remaining : "∞"}
        sub={status.remaining !== null ? `약 ${status.remaining}회 발행` : "지속 생성"}
      />
      <StatusCard
        icon={<Clock className="h-4 w-4 text-fuchsia-400" />}
        label="다음 자동 실행"
        value={relativeFromNow(status.nextRunAt)}
        sub={formatKst(status.nextRunAt)}
      />
      <StatusCard
        icon={<CalendarClock className="h-4 w-4 text-amber-400" />}
        label="최근 생성"
        value={relativeFromNow(status.lastDoneAt)}
        sub={formatKst(status.lastDoneAt)}
      />
    </div>
  );
}

function DashboardHeader({
  feature,
  loading,
  onRefresh,
}: Readonly<{ feature: string; loading: boolean; onRefresh: () => void }>): React.ReactElement {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold text-white">
          <BookOpen className="h-5 w-5 text-indigo-400" /> {feature} 크론 대시보드
        </h1>
        <p className="mt-0.5 text-xs text-zinc-500">
          자동 발행 · 60초마다 자동 새로고침 · KST 기준
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
    </div>
  );
}

function useCronStatus(statusUrl: string): {
  status: GenericCronStatus | null;
  loading: boolean;
  refetch: () => void;
} {
  const [status, setStatus] = useState<GenericCronStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(statusUrl, { cache: "no-store" });
      if (res.ok) setStatus(await res.json() as GenericCronStatus);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [statusUrl]);

  useEffect(() => {
    void refetch();
    const interval = setInterval(() => void refetch(), 60_000);
    return () => clearInterval(interval);
  }, [refetch]);

  return { status, loading, refetch };
}

function useRunGeneration(runUrl: string, refetch: () => void): {
  running: boolean;
  result: GenericRunResult | null;
  runGeneration: (itemId: string | null) => void;
} {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<GenericRunResult | null>(null);

  const runGeneration = useCallback(
    async (itemId: string | null) => {
      setRunning(true);
      setResult(null);
      try {
        const res = await fetch(runUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemId !== null ? { item_id: itemId } : {}),
        });
        const data = (await res.json()) as GenericRunResult;
        setResult(data);
        refetch();
      } catch (e) {
        setResult({ ok: false, error: (e as Error).message });
      } finally {
        setRunning(false);
      }
    },
    [runUrl, refetch],
  );

  return { running, result, runGeneration };
}

export default function CronProgressDashboard({
  feature,
  statusUrl,
  runUrl,
  acceptsItemId = false,
  itemIdLabel = "항목 ID",
}: Readonly<CronProgressDashboardProps>): React.ReactElement {
  const { status, loading, refetch } = useCronStatus(statusUrl);
  const { running, result, runGeneration } = useRunGeneration(runUrl, refetch);

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
      <DashboardHeader feature={feature} loading={loading} onRefresh={() => void refetch()} />
      <ConfigAlerts status={status} />
      <KpiGrid status={status} />
      <ProgressBar status={status} />
      <ManualTrigger
        onRun={runGeneration}
        running={running}
        result={result}
        acceptsItemId={acceptsItemId}
        itemIdLabel={itemIdLabel}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentList rows={status.recentItems} />
        </div>
        <UpcomingList rows={status.upcomingItems} />
      </div>
      <CategoryProgress rows={status.categoryBreakdown} />
      <CronFooter schedule={status.cronSchedule} />
    </div>
  );
}
