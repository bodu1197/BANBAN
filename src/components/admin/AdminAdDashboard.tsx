// @client-reason: Admin dashboard with dynamic data fetching, pagination, and management actions
"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
    Crown,
    TrendingUp,
    Users,
    Coins,
    DollarSign,
    CheckCircle2,
    Clock,
    XCircle,
    CreditCard,
    RotateCcw,
    ChevronLeft,
    ChevronRight,
    Search,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AdminLoadingSpinner, AdminErrorState, AdminPageHeader } from "@/components/admin/admin-shared";
import type { AdPlan, AdSubscription } from "@/types/ads";

// ─── Types ───────────────────────────────────────────────

interface PaymentBreakdown {
    totalCash: number;
    totalPoints: number;
    activeCash: number;
    activePoints: number;
}

interface Pagination {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
}

interface AdminData {
    stats: { totalRevenue: number; activeCount: number; totalCount: number };
    subscriptions: SubWithDetails[];
    plans: AdPlan[];
    paymentBreakdown: PaymentBreakdown;
    pagination: Pagination;
}

type SubWithDetails = AdSubscription & {
    artist?: { title: string; profile_image_path: string | null };
    plan?: { name: string; price: number };
};

// ─── Helpers ─────────────────────────────────────────────

function formatDateTime(iso: string): string {
    const d = new Date(iso);
    return `${d.toLocaleDateString("ko-KR")  } ${  d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
}

// ─── Status Badge ────────────────────────────────────────

function StatusBadge({ status }: Readonly<{ status: string }>): React.ReactElement {
    const config: Record<string, { icon: React.ReactElement; label: string; cls: string }> = {
        ACTIVE: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "활성", cls: "bg-emerald-500/20 text-emerald-400" },
        PENDING: { icon: <Clock className="h-3.5 w-3.5" />, label: "대기", cls: "bg-amber-500/20 text-amber-400" },
        EXPIRED: { icon: <XCircle className="h-3.5 w-3.5" />, label: "만료", cls: "bg-zinc-500/20 text-zinc-400" },
        CANCELLED: { icon: <XCircle className="h-3.5 w-3.5" />, label: "취소", cls: "bg-red-500/20 text-red-400" },
    };
    // eslint-disable-next-line security/detect-object-injection -- Safe: known key lookup
    const c = config[status] ?? config.EXPIRED;
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${c.cls}`}>
            {c.icon} {c.label}
        </span>
    );
}

// ─── Stat Card ───────────────────────────────────────────

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
            {sub ? <p className="mt-1 text-[11px] text-zinc-500">{sub}</p> : null}
        </div>
    );
}

// ─── Revenue Stats Section ──────────────────────────────

function RevenueStatsSection({ stats, paymentBreakdown }: Readonly<{
    stats: AdminData["stats"];
    paymentBreakdown: PaymentBreakdown;
}>): React.ReactElement {
    return (
        <section>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-amber-400">
                <DollarSign className="h-4 w-4" /> 광고 매출
            </h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
                <StatCard icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-400" />} label="총 매출" value={`${stats.totalRevenue.toLocaleString()}원`} />
                <StatCard icon={<CreditCard className="h-3.5 w-3.5 text-blue-400" />} label="카드 결제" value={`${paymentBreakdown.totalCash.toLocaleString()}원`} sub={`활성 ${paymentBreakdown.activeCash.toLocaleString()}원`} />
                <StatCard icon={<Coins className="h-3.5 w-3.5 text-amber-400" />} label="포인트 결제" value={`${paymentBreakdown.totalPoints.toLocaleString()}P`} sub={`활성 ${paymentBreakdown.activePoints.toLocaleString()}P`} />
                <StatCard icon={<Crown className="h-3.5 w-3.5 text-amber-400" />} label="활성 광고" value={`${stats.activeCount}건`} sub={`전체 ${stats.totalCount}건`} />
                <StatCard icon={<Users className="h-3.5 w-3.5 text-blue-400" />} label="광고 아티스트" value={`${stats.activeCount}명`} />
            </div>
        </section>
    );
}

// ─── Plans Section ──────────────────────────────────────

function PlansSection({ plans }: Readonly<{ plans: AdPlan[] }>): React.ReactElement {
    return (
        <section>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-cyan-400">
                <Crown className="h-4 w-4" /> 요금제 관리
            </h2>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {plans.map(plan => (
                    <div key={plan.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-5">
                        <div>
                            <p className="font-semibold text-white">{plan.name}</p>
                            <p className="text-xs text-zinc-400">{plan.duration_days}일 / {plan.is_active ? "활성" : "비활성"}</p>
                        </div>
                        <p className="text-lg font-bold text-amber-400">{plan.price.toLocaleString()}원</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

// ─── Filter Bar ─────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: "", label: "전체" },
    { value: "ACTIVE", label: "활성" },
    { value: "PENDING", label: "대기" },
    { value: "EXPIRED", label: "만료" },
    { value: "CANCELLED", label: "취소" },
];

function FilterBar({ status, search, onStatusChange, onSearchChange }: Readonly<{
    status: string;
    search: string;
    onStatusChange: (s: string) => void;
    onSearchChange: (s: string) => void;
}>): React.ReactElement {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex gap-1.5">
                {STATUS_OPTIONS.map(opt => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onStatusChange(opt.value)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${
                            status === opt.value
                                ? "bg-amber-500/20 text-amber-400"
                                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200 focus-visible:bg-white/5 focus-visible:text-zinc-200"
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
            <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                    type="text"
                    value={search}
                    onChange={e => onSearchChange(e.target.value)}
                    placeholder="아티스트 검색..."
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 focus:border-amber-500/50 focus:outline-none"
                />
            </div>
        </div>
    );
}

// ─── Pagination Controls ────────────────────────────────

function PaginationControls({ pagination, onPageChange }: Readonly<{
    pagination: Pagination;
    onPageChange: (page: number) => void;
}>): React.ReactElement | null {
    if (pagination.totalPages <= 1) return null;
    const { page, totalPages, totalCount } = pagination;
    return (
        <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">총 {totalCount.toLocaleString()}건</p>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    className="rounded-lg border border-white/10 p-1.5 text-zinc-400 transition-colors hover:bg-white/5 disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                    aria-label="이전 페이지"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-zinc-400">{page} / {totalPages}</span>
                <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                    className="rounded-lg border border-white/10 p-1.5 text-zinc-400 transition-colors hover:bg-white/5 disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                    aria-label="다음 페이지"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

// ─── Subscription Table ─────────────────────────────────

function PaymentTypeBadge({ sub }: Readonly<{ sub: SubWithDetails }>): React.ReactElement {
    if (sub.paid_by_cash === 0) {
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-400"><Coins className="h-3 w-3" /> 포인트</span>;
    }
    if (sub.paid_by_points === 0) {
        return <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] font-medium text-blue-400"><CreditCard className="h-3 w-3" /> 카드</span>;
    }
    return <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-[11px] font-medium text-purple-400"><CreditCard className="h-3 w-3" /> 혼합</span>;
}

function RefundButton({ sub, onRefund }: Readonly<{
    sub: SubWithDetails;
    onRefund: (id: string) => void;
}>): React.ReactElement | null {
    if (sub.status !== "ACTIVE") return null;
    return (
        <button
            type="button"
            onClick={() => onRefund(sub.id)}
            className="inline-flex items-center gap-1 rounded-lg bg-red-500/20 px-2.5 py-1 text-[11px] font-medium text-red-400 hover:bg-red-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400"
            aria-label={`${sub.artist?.title ?? "Unknown"} 환불`}
        >
            <RotateCcw className="h-3 w-3" /> 환불
        </button>
    );
}

function SubscriptionTable({ subscriptions, onRefund }: Readonly<{
    subscriptions: SubWithDetails[];
    onRefund: (id: string) => void;
}>): React.ReactElement {
    return (
        <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-xs text-zinc-400">
                        <th className="px-4 py-3 font-medium">상태</th>
                        <th className="px-4 py-3 font-medium">아티스트</th>
                        <th className="px-4 py-3 font-medium">상품</th>
                        <th className="px-4 py-3 font-medium">결제 유형</th>
                        <th className="px-4 py-3 font-medium text-right">총액</th>
                        <th className="px-4 py-3 font-medium text-right">카드</th>
                        <th className="px-4 py-3 font-medium text-right">포인트</th>
                        <th className="px-4 py-3 font-medium">결제일</th>
                        <th className="px-4 py-3 font-medium">만료일</th>
                        <th className="px-4 py-3 font-medium text-center">관리</th>
                    </tr>
                </thead>
                <tbody>
                    {subscriptions.length === 0 ? (
                        <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-zinc-500">결과 없음</td></tr>
                    ) : null}
                    {subscriptions.map(sub => (
                        <tr key={sub.id} className="border-b border-white/5 hover:bg-white/[0.02] focus-visible:bg-white/[0.02]">
                            <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                            <td className="px-4 py-3 text-zinc-300">{sub.artist?.title ?? "Unknown"}</td>
                            <td className="px-4 py-3 text-xs text-zinc-400">{sub.plan?.name ?? "-"}</td>
                            <td className="px-4 py-3"><PaymentTypeBadge sub={sub} /></td>
                            <td className="px-4 py-3 text-right font-medium text-white">{sub.price_paid.toLocaleString()}원</td>
                            <td className="px-4 py-3 text-right text-zinc-300">
                                {sub.paid_by_cash > 0 ? `${sub.paid_by_cash.toLocaleString()}원` : <span className="text-zinc-600">-</span>}
                            </td>
                            <td className="px-4 py-3 text-right text-amber-400">
                                {sub.paid_by_points > 0 ? `${sub.paid_by_points.toLocaleString()}P` : <span className="text-zinc-600">-</span>}
                            </td>
                            <td className="px-4 py-3 text-xs text-zinc-500">{formatDateTime(sub.created_at)}</td>
                            <td className="px-4 py-3 text-xs text-zinc-500">{sub.expires_at ? formatDateTime(sub.expires_at) : "-"}</td>
                            <td className="px-4 py-3 text-center"><RefundButton sub={sub} onRefund={onRefund} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Main Hook ──────────────────────────────────────────

function useAdminData(authLoading: boolean, user: unknown, artistType?: "TATTOO" | "SEMI_PERMANENT"): {
    data: AdminData | null; loading: boolean; error: string | null;
    status: string; search: string;
    setPage: (p: number) => void; setStatus: (s: string) => void; setSearch: (s: string) => void;
    refetch: () => Promise<void>;
} {
    const [data, setData] = useState<AdminData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState("");
    const [search, setSearch] = useState("");
    const [searchDebounced, setSearchDebounced] = useState("");

    useEffect(() => {
        const timer = globalThis.setTimeout(() => setSearchDebounced(search), 300);
        return () => globalThis.clearTimeout(timer);
    }, [search]);

    const fetchData = useCallback(async () => {
        try {
            const params = new URLSearchParams({ page: String(page) });
            if (status) params.set("status", status);
            if (searchDebounced) params.set("search", searchDebounced);
            if (artistType) params.set("artistType", artistType);
            const res = await fetch(`/api/ads/admin?${params.toString()}`);
            if (res.status === 403) { setError("관리자 권한이 필요합니다."); return; }
            if (!res.ok) { setError("데이터를 불러올 수 없습니다."); return; }
            setData(await res.json() as AdminData);
        } catch {
            setError("서버 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    }, [page, status, searchDebounced, artistType]);

    useEffect(() => {
        if (!authLoading && user) fetchData();
        if (!authLoading && !user) { setError("로그인이 필요합니다."); setLoading(false); }
    }, [authLoading, user, fetchData]);

    const handleSetStatus = useCallback((s: string) => { setStatus(s); setPage(1); }, []);
    const handleSetSearch = useCallback((s: string) => { setSearch(s); setPage(1); }, []);

    return { data, loading, error, status, search, setPage, setStatus: handleSetStatus, setSearch: handleSetSearch, refetch: fetchData };
}

// ─── Dashboard Content ──────────────────────────────────

export function DashboardContent({ data, status, search, onPageChange, onStatusChange, onSearchChange, onRefund, dashboardTitle }: Readonly<{
    data: AdminData;
    status: string;
    search: string;
    onPageChange: (p: number) => void;
    onStatusChange: (s: string) => void;
    onSearchChange: (s: string) => void;
    onRefund: (id: string) => void;
    dashboardTitle?: string;
}>): React.ReactElement {
    const { stats, subscriptions, plans, paymentBreakdown, pagination } = data;
    return (
        <div className="min-h-full p-6 pb-40">
            <div className="mb-6">
                <AdminPageHeader title={dashboardTitle ?? "광고 관리 대시보드"} />
            </div>
            <div className="space-y-8">
                <RevenueStatsSection stats={stats} paymentBreakdown={paymentBreakdown} />
                <PlansSection plans={plans} />

                <section className="space-y-4">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                        결제 내역 ({pagination.totalCount.toLocaleString()}건)
                    </h2>
                    <FilterBar status={status} search={search} onStatusChange={onStatusChange} onSearchChange={onSearchChange} />
                    <SubscriptionTable subscriptions={subscriptions} onRefund={onRefund} />
                    <PaginationControls pagination={pagination} onPageChange={onPageChange} />
                </section>
            </div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────

export default function AdminAdDashboard({ artistType, dashboardTitle }: Readonly<{
    artistType?: "TATTOO" | "SEMI_PERMANENT";
    dashboardTitle?: string;
}> = {}): React.ReactElement {
    const { user, isLoading: authLoading } = useAuth();
    const { data, loading, error, status, search, setPage, setStatus, setSearch, refetch } = useAdminData(authLoading, user, artistType);
    const [isPending, startTransition] = useTransition();

    const handleRefund = useCallback((subscriptionId: string) => {
        if (isPending) return;
        const confirmed = globalThis.confirm("정말 환불 처리하시겠습니까?\n카드 결제분은 카드사로 환불, 포인트분은 재지급됩니다.");
        if (!confirmed) return;

        startTransition(async () => {
            const res = await fetch("/api/ads/refund", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subscriptionId }),
            });
            if (res.ok) {
                await refetch();
            } else {
                const err = await res.json() as { error: string };
                globalThis.alert(`환불 실패: ${err.error}`);
            }
        });
    }, [isPending, refetch]);

    if (authLoading || loading) return <AdminLoadingSpinner accentColor="amber" />;
    if (error) return <AdminErrorState message={error} />;
    if (!data) return <AdminLoadingSpinner accentColor="amber" />;

    return (
        <DashboardContent
            data={data}
            status={status}
            search={search}
            onPageChange={setPage}
            onStatusChange={setStatus}
            onSearchChange={setSearch}
            onRefund={handleRefund}
            dashboardTitle={dashboardTitle}
        />
    );
}
