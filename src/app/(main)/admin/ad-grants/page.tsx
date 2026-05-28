// @client-reason: Interactive admin grant management with search, slot editing, cancellation
"use client";
/* eslint-disable max-lines-per-function */

import { useState, useEffect, useCallback, useRef } from "react";
// useRef: useGrants 의 statsFetchedRef 에서 사용
import {
    Gift,
    Crown,
    CheckCircle2,
    XCircle,
    CalendarDays,
    TrendingUp,
    ChevronDown,
    ChevronUp,
    Trash2,
    Eye,
    MousePointerClick,
    Megaphone,
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import {
    AdminLoadingSpinner,
    AdminErrorState,
    AdminPageHeader,
    AdminSearchBar,
    AdminPagination,
} from "@/components/admin/admin-shared";
import type { AdSubscriptionStatus } from "@/types/ads";
import type { AdminGrantRow, AdminGrantStats } from "@/lib/supabase/ad-queries";
import { GRANTS_PAGE_SIZE } from "@/lib/supabase/ad-constants";
import { NewGrantModal } from "./NewGrantModal";
import { SlotEditor, type SlotsCacheData } from "./SlotEditor";

// ─── Types ───────────────────────────────────────────────

interface GrantsData {
    grants: AdminGrantRow[];
    stats: AdminGrantStats | null;
    pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
}

type StatusFilter = AdSubscriptionStatus | "ALL";

// ─── Helpers ─────────────────────────────────────────────

function formatDate(iso: string | null): string {
    if (!iso) return "-";
    return new Date(iso).toLocaleDateString("ko-KR");
}

function daysUntil(iso: string | null): number {
    if (!iso) return 0;
    return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

// WCAG AA 명도 대비 4.5:1 충족을 위해 -300 톤 사용 (-400 은 어두운 배경 위 텍스트로 부족)
const STATUS_LABELS: Record<AdSubscriptionStatus, { label: string; cls: string }> = {
    ACTIVE: { label: "활성", cls: "bg-emerald-500/20 text-emerald-300" },
    PENDING: { label: "대기", cls: "bg-amber-500/20 text-amber-300" },
    EXPIRED: { label: "만료", cls: "bg-zinc-500/20 text-zinc-300" },
    CANCELLED: { label: "취소", cls: "bg-red-500/20 text-red-300" },
};

function StatusBadge({ status }: Readonly<{ status: AdSubscriptionStatus }>): React.ReactElement {
    // eslint-disable-next-line security/detect-object-injection -- typed key
    const cfg = STATUS_LABELS[status];
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.cls}`}>
            {status === "ACTIVE" ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {cfg.label}
        </span>
    );
}

// ─── Stat Card ───────────────────────────────────────────

function StatCard({ icon, label, value }: Readonly<{
    icon: React.ReactElement; label: string; value: string;
}>): React.ReactElement {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-1.5 text-xs text-zinc-400">
                {icon} {label}
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    );
}

function StatsSection({ stats }: Readonly<{ stats: AdminGrantStats | null }>): React.ReactElement | null {
    if (!stats) return null;
    return (
        <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-300">
                <Gift className="h-4 w-4" /> 부여 통계
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard icon={<Crown className="h-3.5 w-3.5 text-amber-300" />} label="총 부여" value={`${stats.totalCount.toLocaleString()}건`} />
                <StatCard icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />} label="활성" value={`${stats.activeCount.toLocaleString()}건`} />
                <StatCard icon={<XCircle className="h-3.5 w-3.5 text-zinc-300" />} label="만료" value={`${stats.expiredCount.toLocaleString()}건`} />
                <StatCard icon={<TrendingUp className="h-3.5 w-3.5 text-blue-300" />} label="이번달 부여" value={`${stats.thisMonthCount.toLocaleString()}건`} />
            </div>
        </section>
    );
}

// ─── Filter Bar ──────────────────────────────────────────

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
    { key: "ALL", label: "전체" },
    { key: "ACTIVE", label: "활성" },
    { key: "EXPIRED", label: "만료" },
    { key: "CANCELLED", label: "취소" },
];

function FilterBar({ status, onStatusChange, onSearch, onNewGrant }: Readonly<{
    status: StatusFilter; onStatusChange: (s: StatusFilter) => void;
    onSearch: (q: string) => void; onNewGrant: () => void;
}>): React.ReactElement {
    return (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-1.5" role="group" aria-label="상태 필터">
                {STATUS_FILTERS.map((f) => (
                    <button
                        key={f.key}
                        type="button"
                        onClick={() => onStatusChange(f.key)}
                        aria-pressed={status === f.key}
                        className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-medium motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                            status === f.key
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>
            <div className="flex flex-1 items-center gap-2 md:max-w-md">
                <AdminSearchBar placeholder="아티스트/샵 이름 검색" onSearch={onSearch} accentColor="emerald" />
                <button
                    type="button"
                    onClick={onNewGrant}
                    className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white motion-safe:transition-colors hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:bg-emerald-600"
                >
                    <Gift className="h-4 w-4" /> 새 부여
                </button>
            </div>
        </div>
    );
}

// ─── Grant Row — 분리된 expanded 패널로 중첩 축소 ──────────

function GrantRowSummary({ grant }: Readonly<{ grant: AdminGrantRow }>): React.ReactElement {
    const daysLeft = daysUntil(grant.expiresAt);
    return (
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-white">{grant.artistTitle}</p>
                <StatusBadge status={grant.status} />
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-zinc-300">
                <span><CalendarDays className="mr-1 inline h-3 w-3" />{grant.durationMonths}개월</span>
                <span>만료 {formatDate(grant.expiresAt)} (D-{daysLeft})</span>
                <span><Megaphone className="mr-1 inline h-3 w-3" />슬롯 {grant.slotCount}개</span>
                <span><Eye className="mr-1 inline h-3 w-3" />{grant.impressionCount.toLocaleString()}</span>
                <span><MousePointerClick className="mr-1 inline h-3 w-3" />{grant.clickCount.toLocaleString()}</span>
            </div>
        </div>
    );
}

function GrantRowExpanded({ grant, onCancel, onReload, cache, onCacheUpdate }: Readonly<{
    grant: AdminGrantRow;
    onCancel: () => void;
    onReload: () => void;
    cache: SlotsCacheData | null;
    onCacheUpdate: (data: SlotsCacheData) => void;
}>): React.ReactElement {
    return (
        <div id={`grant-expand-${grant.id}`} className="border-t border-white/10 bg-black/20 p-4">
            <SlotEditor
                subscriptionId={grant.id}
                onUpdated={onReload}
                cache={cache}
                onCacheUpdate={onCacheUpdate}
            />
            {grant.status === "ACTIVE" && (
                <div className="mt-4 flex justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-red-500/30 px-4 py-2 text-xs font-medium text-red-200 motion-safe:transition-colors hover:bg-red-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:bg-red-500/40"
                    >
                        <Trash2 className="h-3.5 w-3.5" /> 부여 취소
                    </button>
                </div>
            )}
        </div>
    );
}

function GrantRowCard({ grant, expanded, onToggle, onCancel, onReload, cache, onCacheUpdate }: Readonly<{
    grant: AdminGrantRow; expanded: boolean; onToggle: () => void;
    onCancel: () => void; onReload: () => void;
    cache: SlotsCacheData | null;
    onCacheUpdate: (data: SlotsCacheData) => void;
}>): React.ReactElement {
    const expandId = `grant-expand-${grant.id}`;
    return (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={expanded}
                aria-controls={expandId}
                aria-label={`${grant.artistTitle} 부여 ${expanded ? "접기" : "펼치기"}`}
                className="flex w-full items-center gap-3 p-4 text-left motion-safe:transition-colors hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-700">
                    {grant.artistProfileImage ? (
                        <Image src={grant.artistProfileImage} alt="" fill sizes="40px" className="object-cover" />
                    ) : null}
                </div>
                <GrantRowSummary grant={grant} />
                {expanded ? <ChevronUp className="h-4 w-4 text-zinc-300" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 text-zinc-300" aria-hidden="true" />}
            </button>
            {expanded && (
                <GrantRowExpanded
                    grant={grant}
                    onCancel={onCancel}
                    onReload={onReload}
                    cache={cache}
                    onCacheUpdate={onCacheUpdate}
                />
            )}
        </div>
    );
}

// ─── Data Hook ───────────────────────────────────────────

function useGrants(authLoading: boolean, user: unknown): {
    data: GrantsData | null; loading: boolean; error: string | null;
    status: StatusFilter; search: string; page: number;
    setStatus: (s: StatusFilter) => void; setSearch: (s: string) => void; setPage: (p: number) => void;
    refetch: () => void;
} {
    const [data, setData] = useState<GrantsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<StatusFilter>("ALL");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    // 통계는 첫 로드와 명시적 refetch 시에만 — 페이지/필터 변경 시 4 count 쿼리 절약
    const statsFetchedRef = useRef(false);

    const fetchData = useCallback(async (forceStats = false) => {
        setLoading(true);
        try {
            const includeStats = forceStats || !statsFetchedRef.current;
            const params = new URLSearchParams({
                page: String(page),
                pageSize: String(GRANTS_PAGE_SIZE),
                status,
                includeStats: String(includeStats),
            });
            if (search) params.set("search", search);
            const res = await fetch(`/api/admin/ads/grant?${params.toString()}`);
            if (!res.ok) {
                const err = await res.json() as { error?: string };
                throw new Error(err.error ?? "조회 실패");
            }
            const json = await res.json() as GrantsData;
            setData((prev) => ({
                grants: json.grants,
                // includeStats=false 응답은 stats=null → 이전 stats 유지
                stats: json.stats ?? prev?.stats ?? null,
                pagination: json.pagination,
            }));
            if (includeStats && json.stats) statsFetchedRef.current = true;
            setError(null);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "알 수 없는 오류");
        } finally {
            setLoading(false);
        }
    }, [page, status, search]);

    const refetch = useCallback(() => { void fetchData(true); }, [fetchData]);

    useEffect(() => {
        if (authLoading || !user) return;
        void fetchData();
    }, [authLoading, user, fetchData]);

    return { data, loading, error, status, search, page, setStatus, setSearch, setPage, refetch };
}

// ─── Main Page ───────────────────────────────────────────

export default function AdminAdGrantsPage(): React.ReactElement {
    const { user, isLoading: authLoading } = useAuth();
    const { data, loading, error, status, search, page, setStatus, setSearch, setPage, refetch } = useGrants(authLoading, user);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showNewModal, setShowNewModal] = useState(false);
    // 슬롯 캐시 — subscriptionId 별 첫 펼침 때만 fetch, 이후 접었다 펼쳐도 캐시 사용.
    // immutable Map 으로 보관 — set 시 new Map(prev) 으로 react state 트리거.
    const [slotsCache, setSlotsCache] = useState<ReadonlyMap<string, SlotsCacheData>>(() => new Map());

    const handleStatusChange = useCallback((s: StatusFilter): void => { setStatus(s); setPage(1); }, [setStatus, setPage]);
    const handleSearch = useCallback((q: string): void => { setSearch(q); setPage(1); }, [setSearch, setPage]);

    const handleCancel = useCallback(async (subscriptionId: string): Promise<void> => {
        if (!globalThis.confirm("이 부여를 취소하시겠습니까? 즉시 광고 노출이 중단됩니다.")) return;
        try {
            const res = await fetch(`/api/admin/ads/grants/${subscriptionId}/cancel`, { method: "POST" });
            if (res.ok) {
                setSlotsCache((prev) => {
                    const next = new Map(prev);
                    next.delete(subscriptionId);
                    return next;
                });
                refetch();
                setExpandedId(null);
            } else {
                const err = await res.json() as { error?: string };
                globalThis.alert(`취소 실패: ${err.error ?? "알 수 없는 오류"}`);
            }
        } catch (e: unknown) {
            globalThis.alert(`취소 실패: ${e instanceof Error ? e.message : "네트워크 오류"}`);
        }
    }, [refetch]);

    const handleCacheUpdate = useCallback((subscriptionId: string, slotData: SlotsCacheData): void => {
        setSlotsCache((prev) => {
            const next = new Map(prev);
            next.set(subscriptionId, slotData);
            return next;
        });
    }, []);

    if (authLoading || loading) return <AdminLoadingSpinner accentColor="emerald" />;
    if (error) return <AdminErrorState message={error} />;
    if (!data) return <AdminLoadingSpinner accentColor="emerald" />;

    return (
        <div className="min-h-full p-6 pb-40">
            <div className="mb-6">
                <AdminPageHeader title="무료 광고 부여 관리" count={data.pagination.totalCount} />
            </div>
            <div className="space-y-8">
                <StatsSection stats={data.stats} />
                <section className="space-y-4">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                        부여 내역
                    </h2>
                    <FilterBar
                        status={status}
                        onStatusChange={handleStatusChange}
                        onSearch={handleSearch}
                        onNewGrant={() => setShowNewModal(true)}
                    />
                    <div className="space-y-2">
                        {data.grants.length === 0 ? (
                            <p className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-300">
                                부여 내역이 없습니다.
                            </p>
                        ) : (
                            data.grants.map((g) => (
                                <GrantRowCard
                                    key={g.id}
                                    grant={g}
                                    expanded={expandedId === g.id}
                                    onToggle={() => setExpandedId(expandedId === g.id ? null : g.id)}
                                    onCancel={() => void handleCancel(g.id)}
                                    onReload={refetch}
                                    cache={expandedId === g.id ? slotsCache.get(g.id) ?? null : null}
                                    onCacheUpdate={(d) => handleCacheUpdate(g.id, d)}
                                />
                            ))
                        )}
                    </div>
                    <AdminPagination
                        currentPage={data.pagination.page}
                        total={data.pagination.totalCount}
                        limit={data.pagination.pageSize}
                        onPageChange={setPage}
                    />
                </section>
            </div>
            {showNewModal && (
                <NewGrantModal
                    onClose={() => setShowNewModal(false)}
                    onGranted={() => { setShowNewModal(false); refetch(); }}
                />
            )}
        </div>
    );
}
