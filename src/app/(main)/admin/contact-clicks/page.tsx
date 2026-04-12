// @client-reason: Interactive dashboard with period tabs, real-time polling, and dynamic charts
"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Phone, MessageSquareText, TrendingUp,
    BarChart3, Clock, Globe, Activity, Users, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatTimeKST } from "@/lib/utils/format";

// ─── Types ───────────────────────────────────────────────

interface Stats {
    todayTotal: number; todayKakao: number; todayPhone: number;
    yesterdayTotal: number;
    thisWeekTotal: number; lastWeekTotal: number;
    periodTotal: number; periodKakao: number; periodPhone: number;
}
interface ChartRow { date: string; kakao: number; phone: number }
interface ArtistStat {
    artist_id: string; artist_name: string;
    kakao: number; phone: number; total: number; percent: number;
    dailyTrend: ChartRow[];
}
interface HourlyStat { hour: number; kakao: number; phone: number }
interface SourceStat { source: string; count: number; percent: number }
interface RecentClick { id: string; artist_name: string; click_type: string; source_page: string; created_at: string; artist_today_count: number }
type Period = "daily" | "monthly" | "yearly";

interface DashboardData {
    stats: Stats;
    chartData: ChartRow[];
    artistStats: ArtistStat[];
    hourlyToday: HourlyStat[];
    sourceBreakdown: SourceStat[];
    recentClicks: RecentClick[];
}

// ─── Helpers ────────────────────────────────────────────

function resolveDirection(pct: number): "up" | "down" | "same" {
    if (pct > 0) return "up";
    if (pct < 0) return "down";
    return "same";
}

function calcChange(current: number, previous: number): { pct: number; direction: "up" | "down" | "same" } {
    if (previous === 0) return { pct: current > 0 ? 100 : 0, direction: current > 0 ? "up" : "same" };
    const pct = Math.round(((current - previous) / previous) * 100);
    return { pct: Math.abs(pct), direction: resolveDirection(pct) };
}

const SOURCE_LABELS: Record<string, string> = {
    "portfolio_detail": "포트폴리오 상세",
    "artist_detail": "아티스트 페이지",
    "search": "검색 결과",
    "home": "홈",
    "직접": "직접 유입",
};

function sourceLabel(src: string): string {
    // eslint-disable-next-line security/detect-object-injection -- Safe: known Record lookup
    return SOURCE_LABELS[src] ?? src.replace(/_/g, " ").replace(/\//g, " \u203A ");
}

// ─── KPI Card ──────────────────────────────────────────

const DIRECTION_COLORS: Record<string, string> = {
    up: "text-emerald-400",
    down: "text-red-400",
    same: "text-zinc-500",
};

const DIRECTION_ICONS: Record<string, React.ReactElement> = {
    up: <ArrowUpRight className="h-3 w-3" />,
    down: <ArrowDownRight className="h-3 w-3" />,
    same: <Minus className="h-3 w-3" />,
};

function KPICard({ icon, label, value, change, sub }: Readonly<{
    icon: React.ReactElement;
    label: string;
    value: number | string;
    change?: { pct: number; direction: "up" | "down" | "same"; label: string };
    sub?: string;
}>): React.ReactElement {
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:p-5">
            <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">{icon} {label}</div>
            <p className="text-2xl font-bold text-white md:text-3xl">{typeof value === "number" ? value.toLocaleString() : value}</p>
            {change ? (
                <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${DIRECTION_COLORS[change.direction]}`}>
                    {DIRECTION_ICONS[change.direction]}
                    {change.pct}% {change.label}
                </div>
            ) : null}
            {sub ? <p className="mt-1.5 text-xs text-zinc-300">{sub}</p> : null}
        </div>
    );
}

// ─── Period Tabs ────────────────────────────────────────

const PERIODS: { key: Period; label: string }[] = [
    { key: "daily", label: "일별" },
    { key: "monthly", label: "월별" },
    { key: "yearly", label: "연별" },
];

function PeriodTabs({ period, onChange }: Readonly<{ period: Period; onChange: (p: Period) => void }>): React.ReactElement {
    return (
        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
            {PERIODS.map(p => (
                <button
                    key={p.key}
                    type="button"
                    onClick={() => onChange(p.key)}
                    aria-pressed={period === p.key}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                        period === p.key ? "bg-teal-600 text-white" : "text-zinc-400 hover:text-white"
                    }`}
                >
                    {p.label}
                </button>
            ))}
        </div>
    );
}

// ─── Stacked Bar Chart ────────────────────────────────

function ChartSection({ data, period }: Readonly<{ data: ChartRow[]; period: Period }>): React.ReactElement {
    if (data.length === 0) {
        return <p className="py-12 text-center text-sm text-zinc-500">데이터가 없습니다</p>;
    }

    const display = period === "monthly" ? data.slice(-12) : data.slice(-14);
    const maxVal = Math.max(...display.map(d => d.kakao + d.phone), 1);

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-teal-400">
                <BarChart3 className="h-4 w-4" /> 기간별 추이
            </h3>
            {/* Y-axis scale */}
            <div className="mb-1 flex justify-end gap-6 text-xs text-zinc-400">
                <span>{maxVal}건</span>
                <span>{Math.round(maxVal / 2)}건</span>
                <span>0건</span>
            </div>
            {/* Vertical bar chart */}
            <div className="flex h-[180px] items-end gap-1 md:gap-2">
                {display.map(row => {
                    const total = row.kakao + row.phone;
                    const kakaoH = (row.kakao / maxVal) * 100;
                    const phoneH = (row.phone / maxVal) * 100;
                    return (
                        <div key={row.date} className="group relative flex flex-1 flex-col items-center">
                            {/* Tooltip */}
                            <div className="pointer-events-none absolute -top-10 z-10 hidden rounded bg-zinc-800 px-2 py-1 text-[10px] text-white shadow-lg group-hover:block group-focus-visible:block">
                                카카오 {row.kakao} · 전화 {row.phone} = {total}
                            </div>
                            {/* Bars */}
                            <div className="flex h-[160px] w-full flex-col items-center justify-end">
                                <div className="w-full max-w-8 rounded-t bg-yellow-500 transition-all" style={{ height: `${kakaoH}%`, minHeight: row.kakao > 0 ? "2px" : "0" }} />
                                <div className="w-full max-w-8 rounded-b bg-blue-500 transition-all" style={{ height: `${phoneH}%`, minHeight: row.phone > 0 ? "2px" : "0" }} />
                            </div>
                            {/* Label */}
                            <span className="mt-1 text-xs text-zinc-400">
                                {row.date.length > 7 ? row.date.slice(5) : row.date.slice(2)}
                            </span>
                        </div>
                    );
                })}
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-zinc-300">
                <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-yellow-500" /> 카카오톡</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-500" /> 전화</span>
            </div>
        </div>
    );
}

// ─── Hourly Heatmap ──────────────────────────────────

function HourlyHeatmap({ data }: Readonly<{ data: HourlyStat[] }>): React.ReactElement {
    const maxVal = Math.max(...data.map(d => d.kakao + d.phone), 1);

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-teal-400">
                <Clock className="h-4 w-4" /> 오늘 시간대별 문의
            </h3>
            <div className="grid grid-cols-12 gap-1 md:grid-cols-24">
                {data.map(h => {
                    const total = h.kakao + h.phone;
                    const intensity = total === 0 ? 0 : Math.max(0.15, total / maxVal);
                    return (
                        <div key={h.hour} className="group relative flex flex-col items-center">
                            <div
                                className="aspect-square w-full rounded transition-colors"
                                style={{
                                    backgroundColor: total === 0
                                        ? "rgba(255,255,255,0.03)"
                                        : `rgba(20, 184, 166, ${intensity})`,
                                }}
                            />
                            <span className="mt-0.5 text-xs text-zinc-400">{h.hour}</span>
                            {total > 0 ? (
                                <div className="pointer-events-none absolute -top-8 z-10 hidden rounded bg-zinc-800 px-2 py-1 text-[10px] text-white shadow-lg group-hover:block group-focus-visible:block">
                                    {h.hour}시: 카카오 {h.kakao} · 전화 {h.phone}
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
                <span>새벽</span>
                <span>오전</span>
                <span>오후</span>
                <span>밤</span>
            </div>
        </div>
    );
}

// ─── Source Breakdown ─────────────────────────────────

function SourceBreakdown({ data }: Readonly<{ data: SourceStat[] }>): React.ReactElement {
    if (data.length === 0) return <p className="py-8 text-center text-sm text-zinc-500">데이터가 없습니다</p>;
    const maxCount = data[0]?.count ?? 1;

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-teal-400">
                <Globe className="h-4 w-4" /> 유입 경로
            </h3>
            <div className="space-y-2">
                {data.slice(0, 10).map(row => (
                    <div key={row.source} className="flex items-center gap-3">
                        <span className="w-32 shrink-0 truncate text-xs text-zinc-300 md:w-40">{sourceLabel(row.source)}</span>
                        <div className="flex-1">
                            <div
                                className="h-5 min-w-1 rounded bg-teal-600/60 transition-all"
                                style={{ width: `${(row.count / maxCount) * 100}%` }}
                            />
                        </div>
                        <span className="w-10 shrink-0 text-right text-xs font-medium text-white">{row.count}</span>
                        <span className="w-10 shrink-0 text-right text-xs text-zinc-300">{row.percent}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Artist Ranking ──────────────────────────────────

const MEDALS = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];

function ArtistSparkline({ trend }: Readonly<{ trend: ChartRow[] }>): React.ReactElement {
    if (trend.length === 0) return <span className="text-xs text-zinc-500">{"\u2014"}</span>;
    const peak = Math.max(...trend.map(x => x.kakao + x.phone), 1);
    return (
        <>
            {trend.map(d => (
                <div
                    key={d.date}
                    className="w-2 rounded-t bg-teal-400/60"
                    style={{ height: `${Math.max(2, ((d.kakao + d.phone) / peak) * 18)}px` }}
                />
            ))}
        </>
    );
}

function ArtistRow({ row, rank, maxTotal }: Readonly<{ row: ArtistStat; rank: number; maxTotal: number }>): React.ReactElement {
    return (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/5 focus-visible:bg-white/5">
            <span className="w-8 text-center text-xs font-bold text-zinc-500">
                {/* eslint-disable-next-line security/detect-object-injection -- Safe: index 0-2 */}
                {rank < 3 ? MEDALS[rank] : rank + 1}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium text-white">{row.artist_name}</span>
            <div className="hidden w-28 items-center gap-1 md:flex">
                <div className="flex-1">
                    <div className="h-2 min-w-0.5 rounded-full bg-teal-500/70" style={{ width: `${(row.total / maxTotal) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-xs text-zinc-300">{row.percent}%</span>
            </div>
            <span className="w-12 text-center text-yellow-400">{row.kakao}</span>
            <span className="w-12 text-center text-blue-400">{row.phone}</span>
            <span className="w-12 text-center font-bold text-white">{row.total}</span>
            <div className="hidden h-5 w-24 items-end justify-center gap-px md:flex">
                <ArtistSparkline trend={row.dailyTrend} />
            </div>
        </div>
    );
}

function ArtistRanking({ data }: Readonly<{ data: ArtistStat[] }>): React.ReactElement {
    if (data.length === 0) return <p className="py-8 text-center text-sm text-zinc-500">데이터가 없습니다</p>;
    const maxTotal = data[0]?.total ?? 1;

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-teal-400">
                <Users className="h-4 w-4" /> 아티스트별 문의 현황
            </h3>
            <div className="space-y-1">
                <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-zinc-400">
                    <span className="w-8 text-center">#</span>
                    <span className="min-w-0 flex-1">아티스트</span>
                    <span className="hidden w-28 md:block">비중</span>
                    <span className="w-12 text-center">카카오</span>
                    <span className="w-12 text-center">전화</span>
                    <span className="w-12 text-center">합계</span>
                    <span className="hidden w-24 text-center md:block">7일 추이</span>
                </div>
                {data.slice(0, 30).map((row, i) => (
                    <ArtistRow key={row.artist_id} row={row} rank={i} maxTotal={maxTotal} />
                ))}
            </div>
        </div>
    );
}

// ─── Recent Activity ─────────────────────────────────

function RecentActivity({ data }: Readonly<{ data: RecentClick[] }>): React.ReactElement {
    if (data.length === 0) return <p className="py-8 text-center text-sm text-zinc-500">오늘 문의가 없습니다</p>;

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-teal-400">
                <Activity className="h-4 w-4" /> 오늘 문의 활동
            </h3>
            <div className="space-y-1 text-sm">
                {data.slice(0, 20).map(click => (
                    <div key={click.id} className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-white/5 focus-visible:bg-white/5">
                        {/* Type icon */}
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                            click.click_type === "kakao" ? "bg-yellow-500/20" : "bg-blue-500/20"
                        }`}>
                            {click.click_type === "kakao"
                                ? <MessageSquareText className="h-3.5 w-3.5 text-yellow-400" />
                                : <Phone className="h-3.5 w-3.5 text-blue-400" />}
                        </div>
                        {/* Artist name + today count */}
                        <span className="min-w-0 flex-1 truncate font-medium text-white">
                            {click.artist_name}
                            {click.artist_today_count > 1 ? (
                                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-600/30 px-1.5 text-xs font-bold text-teal-300">
                                    {click.artist_today_count}건
                                </span>
                            ) : null}
                        </span>
                        {/* Source */}
                        <span className="hidden text-xs text-zinc-400 md:block">{sourceLabel(click.source_page)}</span>
                        {/* Time */}
                        <span className="shrink-0 text-xs text-zinc-500">{formatTimeKST(click.created_at)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Hook ──────────────────────────────────────────────

function useContactClicks(authLoading: boolean, userId: string | undefined, period: Period): {
    data: DashboardData | null; loading: boolean;
} {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async (p: Period) => {
        try {
            const res = await fetch(`/api/admin/contact-clicks?period=${p}`);
            if (!res.ok) return;
            setData(await res.json() as DashboardData);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (authLoading || !userId) {
            if (!authLoading) setLoading(false);
            return;
        }
        void fetchData(period);
        const interval = setInterval(() => void fetchData(period), 30_000);
        return () => clearInterval(interval);
    }, [authLoading, userId, period, fetchData]);

    return { data, loading };
}

// ─── KPI Row ───────────────────────────────────────────

function KPIRow({ stats, artistStats }: Readonly<{ stats: Stats; artistStats: ArtistStat[] }>): React.ReactElement {
    const vsYesterday = calcChange(stats.todayTotal, stats.yesterdayTotal);
    const vsLastWeek = calcChange(stats.thisWeekTotal, stats.lastWeekTotal);
    const kakaoRatio = stats.periodTotal > 0 ? Math.round((stats.periodKakao / stats.periodTotal) * 100) : 0;

    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KPICard
                icon={<TrendingUp className="h-4 w-4 text-teal-400" />}
                label="오늘 총 문의"
                value={stats.todayTotal}
                change={{ ...vsYesterday, label: "vs 어제" }}
                sub={`카카오 ${stats.todayKakao} · 전화 ${stats.todayPhone}`}
            />
            <KPICard
                icon={<BarChart3 className="h-4 w-4 text-purple-400" />}
                label="이번 주"
                value={stats.thisWeekTotal}
                change={{ ...vsLastWeek, label: "vs 지난주" }}
            />
            <KPICard
                icon={<MessageSquareText className="h-4 w-4 text-yellow-400" />}
                label="카카오 비율"
                value={`${kakaoRatio}%`}
                sub={`카카오 ${stats.periodKakao} · 전화 ${stats.periodPhone}`}
            />
            <KPICard
                icon={<Activity className="h-4 w-4 text-emerald-400" />}
                label="기간 총 문의"
                value={stats.periodTotal}
                sub={artistStats[0] ? `TOP: ${artistStats[0].artist_name} (${artistStats[0].total}건)` : undefined}
            />
        </div>
    );
}

// ─── Main ──────────────────────────────────────────────

export default function ContactClicksPage(): React.ReactElement {
    const { user, isLoading: authLoading } = useAuth();
    const [period, setPeriod] = useState<Period>("daily");
    const { data, loading } = useContactClicks(authLoading, user?.id, period);

    if (authLoading || loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
            </div>
        );
    }

    if (!data) {
        return <p className="py-20 text-center text-sm text-zinc-500">데이터를 불러올 수 없습니다</p>;
    }

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-lg font-bold text-white">
                        <Phone className="h-5 w-5 text-teal-400" /> 연락 클릭 대시보드
                    </h1>
                    <p className="mt-0.5 text-xs text-zinc-500">30초마다 자동 새로고침 · KST 기준</p>
                </div>
                <PeriodTabs period={period} onChange={setPeriod} />
            </div>

            <KPIRow stats={data.stats} artistStats={data.artistStats} />

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <ChartSection data={data.chartData} period={period} />
                </div>
                <HourlyHeatmap data={data.hourlyToday} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <SourceBreakdown data={data.sourceBreakdown} />
                <RecentActivity data={data.recentClicks} />
            </div>

            <ArtistRanking data={data.artistStats} />
        </div>
    );
}
