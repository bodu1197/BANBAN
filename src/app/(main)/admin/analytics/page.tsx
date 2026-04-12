// @client-reason: Admin analytics dashboard with dynamic data fetching and period switching
"use client";

import { useState, useEffect, useCallback } from "react";
import {
    BarChart3,
    TrendingUp,
    Eye,
    FileText,
    Clock,
    Calendar,
    CalendarDays,
    CalendarRange,
    Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AdminLoadingSpinner, AdminErrorState, AdminPageHeader } from "@/components/admin/admin-shared";

// ─── Types ──────────────────────────────────────────────

type Period = "hourly" | "daily" | "monthly" | "yearly";

interface ChartItem {
    hour?: string;
    date?: string;
    month?: string;
    year?: string;
    count: number;
    uv: number;
}

interface PathItem {
    path: string;
    count: number;
}

interface AnalyticsData {
    periodPV: number;
    periodUV: number;
    totalPV: number;
    totalUV: number;
    chartData: ChartItem[];
    topPaths: PathItem[];
}

// ─── Period Tabs ────────────────────────────────────────

const PERIODS: { key: Period; label: string; icon: React.ReactElement }[] = [
    { key: "hourly", label: "시간별", icon: <Clock className="h-3.5 w-3.5" /> },
    { key: "daily", label: "일별", icon: <Calendar className="h-3.5 w-3.5" /> },
    { key: "monthly", label: "월별", icon: <CalendarDays className="h-3.5 w-3.5" /> },
    { key: "yearly", label: "년별", icon: <CalendarRange className="h-3.5 w-3.5" /> },
];

function PeriodTabs({ period, onChange }: Readonly<{
    period: Period;
    onChange: (p: Period) => void;
}>): React.ReactElement {
    return (
        <div className="flex gap-1 rounded-lg bg-white/5 p-1">
            {PERIODS.map((p) => (
                <button
                    key={p.key}
                    type="button"
                    aria-pressed={period === p.key}
                    onClick={() => onChange(p.key)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        period === p.key
                            ? "bg-brand-primary text-white"
                            : "text-zinc-400 hover:bg-white/5 hover:text-white focus-visible:bg-white/5 focus-visible:text-white"
                    }`}
                >
                    {p.icon}
                    {p.label}
                </button>
            ))}
        </div>
    );
}

// ─── Stat Card ──────────────────────────────────────────

function StatCard({ icon, label, value, sub }: Readonly<{
    icon: React.ReactElement;
    label: string;
    value: string;
    sub?: string;
}>): React.ReactElement {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-1.5 text-xs text-zinc-400">
                {icon} {label}
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            {sub && <p className="mt-1 text-[11px] text-zinc-500">{sub}</p>}
        </div>
    );
}

// ─── Bar Chart ──────────────────────────────────────────

function getChartLabel(item: ChartItem, period: Period): string {
    const raw = item.hour ?? item.date ?? item.month ?? item.year ?? "";
    if (period === "daily") return `${raw.substring(8)}일`;
    if (period === "monthly") return `${raw.substring(5)}월`;
    if (period === "yearly") return `${raw}년`;
    return raw;
}

function BarRow({ label, pv, uv, maxVal }: Readonly<{
    label: string;
    pv: number;
    uv: number;
    maxVal: number;
}>): React.ReactElement {
    const pvPct = (pv / maxVal) * 100;
    const uvPct = (uv / maxVal) * 100;
    return (
        <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-right text-xs text-zinc-500">{label}</span>
            <div className="flex-1 space-y-0.5">
                <div className="relative h-4 overflow-hidden rounded bg-white/5">
                    <div className="absolute inset-y-0 left-0 rounded bg-blue-500/60" style={{ width: `${pvPct}%` }} />
                    <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-medium text-zinc-300">
                        {pv.toLocaleString()}
                    </span>
                </div>
                <div className="relative h-4 overflow-hidden rounded bg-white/5">
                    <div className="absolute inset-y-0 left-0 rounded bg-emerald-500/60" style={{ width: `${uvPct}%` }} />
                    <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-medium text-zinc-300">
                        {uv.toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    );
}

function SimpleBarChart({ data, period }: Readonly<{
    data: ChartItem[];
    period: Period;
}>): React.ReactElement {
    if (data.length === 0) {
        return <p className="py-12 text-center text-sm text-zinc-500">데이터가 없습니다</p>;
    }

    const maxVal = Math.max(...data.flatMap((d) => [d.count, d.uv]), 1);

    return (
        <div className="space-y-1.5">
            <div className="mb-3 flex items-center gap-4 text-xs text-zinc-500">
                <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded bg-blue-500/60" /> PV (페이지뷰)
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded bg-emerald-500/60" /> UV (순 방문자)
                </span>
            </div>
            {data.map((item) => {
                const label = getChartLabel(item, period);
                return <BarRow key={label} label={label} pv={item.count} uv={item.uv} maxVal={maxVal} />;
            })}
        </div>
    );
}

// ─── Top Pages ──────────────────────────────────────────

function TopPages({ data }: Readonly<{ data: PathItem[] }>): React.ReactElement {
    if (data.length === 0) {
        return <p className="py-8 text-center text-sm text-zinc-500">데이터가 없습니다</p>;
    }
    return (
        <div className="space-y-1">
            {data.map((item, i) => (
                <div key={item.path} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/[0.02] focus-visible:bg-white/[0.02]">
                    <span className="w-5 text-center text-xs font-bold text-zinc-500">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-zinc-300">{item.path}</span>
                    <span className="shrink-0 text-xs font-medium text-zinc-400">
                        {item.count.toLocaleString()}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ─── Hook ───────────────────────────────────────────────

function normalizeAnalytics(raw: AnalyticsData): AnalyticsData {
    return {
        periodPV: raw.periodPV ?? 0,
        periodUV: raw.periodUV ?? 0,
        totalPV: raw.totalPV ?? 0,
        totalUV: raw.totalUV ?? 0,
        chartData: (raw.chartData ?? []).map((c) => ({ ...c, count: c.count ?? 0, uv: c.uv ?? 0 })),
        topPaths: raw.topPaths ?? [],
    };
}

function useAnalytics(authLoading: boolean, userId: string | undefined, period: Period): {
    data: AnalyticsData | null;
    loading: boolean;
    error: string | null;
} {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (p: Period) => {
        setData(null);
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/analytics?period=${p}`);
            if (res.status === 403) { setError("관리자 권한이 필요합니다."); return; }
            if (!res.ok) { setError("데이터를 불러올 수 없습니다."); return; }
            setData(normalizeAnalytics(await res.json() as AnalyticsData));
            setError(null);
        } catch {
            setError("서버 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && userId) void fetchData(period);
        if (!authLoading && !userId) { setError("로그인이 필요합니다."); setLoading(false); }
    }, [authLoading, userId, period, fetchData]);

    return { data, loading, error };
}

function getPeriodLabel(period: Period): string {
    const now = new Date();
    const kstMonth = new Intl.DateTimeFormat("ko", { month: "long", timeZone: "Asia/Seoul" }).format(now);
    const kstYear = new Intl.DateTimeFormat("ko", { year: "numeric", timeZone: "Asia/Seoul" }).format(now);
    switch (period) {
        case "hourly": return "오늘";
        case "daily": return kstMonth;
        case "monthly": return kstYear;
        case "yearly": return "전체";
    }
}

// ─── Main ───────────────────────────────────────────────

/* eslint-disable max-lines-per-function */
export default function AdminAnalyticsPage(): React.ReactElement {
    const { user, isLoading: authLoading } = useAuth();
    const [period, setPeriod] = useState<Period>("hourly");
    const { data, loading, error } = useAnalytics(authLoading, user?.id, period);

    if (authLoading) return <AdminLoadingSpinner accentColor="blue" />;
    if (error) return <AdminErrorState message={error} />;

    const periodLabel = getPeriodLabel(period);
    const isLoading = loading || !data;

    return (
        <div className="min-h-full p-6 pb-40">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <AdminPageHeader title="접속자 현황 — 한국" />
                <PeriodTabs period={period} onChange={setPeriod} />
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-24">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <StatCard
                            icon={<Eye className="h-3.5 w-3.5 text-blue-400" />}
                            label={`${periodLabel} 페이지뷰`}
                            value={data.periodPV.toLocaleString()}
                            sub="한국 PV"
                        />
                        <StatCard
                            icon={<Users className="h-3.5 w-3.5 text-emerald-400" />}
                            label={`${periodLabel} 순 방문자`}
                            value={data.periodUV.toLocaleString()}
                            sub="한국 UV"
                        />
                        <StatCard
                            icon={<TrendingUp className="h-3.5 w-3.5 text-blue-400" />}
                            label="전체 페이지뷰"
                            value={data.totalPV.toLocaleString()}
                            sub="한국 누적 PV"
                        />
                        <StatCard
                            icon={<Users className="h-3.5 w-3.5 text-emerald-400" />}
                            label="전체 순 방문자"
                            value={data.totalUV.toLocaleString()}
                            sub="한국 누적 UV"
                        />
                    </div>

                    {/* Chart */}
                    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-blue-400">
                            <BarChart3 className="h-4 w-4" />
                            {PERIODS.find((p) => p.key === period)?.label} 방문 추이
                        </h2>
                        <SimpleBarChart data={data.chartData} period={period} />
                    </section>

                    {/* Top Pages */}
                    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-blue-400">
                            <FileText className="h-4 w-4" /> 인기 페이지 ({periodLabel})
                        </h2>
                        <TopPages data={data.topPaths} />
                    </section>
                </div>
            )}
        </div>
    );
}
