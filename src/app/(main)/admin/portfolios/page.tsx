// @client-reason: Admin portfolio management with search, pagination, and delete confirmation
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Heart, Eye, Pencil } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { getStorageUrl } from "@/lib/supabase/storage-utils";
import { AdminSearchBar, AdminPagination, AdminSearchResetBadge, AdminLoadingSpinner, AdminErrorState, AdminPageHeader } from "@/components/admin/admin-shared";

// ─── Types ───────────────────────────────────────────────

type PortfolioTab = "semi_permanent";

interface Portfolio {
    id: string;
    title: string;
    description: string;
    price_origin: number;
    price: number;
    discount_rate: number;
    likes_count: number;
    views_count: number;
    created_at: string;
    thumbnail: string | null;
    artist: { id: string; title: string; profile_image_path: string | null } | null;
}

interface PortfoliosResponse {
    portfolios: Portfolio[];
    total: number;
    page: number;
    limit: number;
}

const TAB_LIST: { key: PortfolioTab; label: string }[] = [
    { key: "semi_permanent", label: "반영구" },
];

// ─── Hooks ──────────────────────────────────────────────

function usePortfolioList(authLoading: boolean, user: unknown): {
    data: PortfoliosResponse | null;
    loading: boolean;
    error: string | null;
    search: string;
    tab: PortfolioTab;
    setSearch: (s: string) => void;
    setPage: (p: number) => void;
    setTab: (t: PortfolioTab) => void;
    refetch: () => void;
} {
    const [data, setData] = useState<PortfoliosResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [tab, setTab] = useState<PortfolioTab>("semi_permanent");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), tab });
            if (search) params.set("search", search);
            const res = await fetch(`/api/admin/portfolios?${params.toString()}`);
            if (res.status === 403) { setError("관리자 권한이 필요합니다."); return; }
            if (!res.ok) { setError("데이터를 불러올 수 없습니다."); return; }
            setData(await res.json() as PortfoliosResponse);
            setError(null);
        } catch {
            setError("서버 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    }, [search, page, tab]);

    useEffect(() => {
        if (!authLoading && user) fetchData();
        if (!authLoading && !user) { setError("로그인이 필요합니다."); setLoading(false); }
    }, [authLoading, user, fetchData]);

    return { data, loading, error, search, tab, setSearch, setPage, setTab, refetch: fetchData };
}

// ─── PortfolioThumbnail ─────────────────────────────────

function PortfolioThumbnail({ src, alt, portfolioId }: Readonly<{
    src: string | null; alt: string; portfolioId: string;
}>): React.ReactElement {
    const thumbUrl = src ? getStorageUrl(src) : null;
    return (
        <Link href={`/portfolios/${portfolioId}`} target="_blank" className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {thumbUrl
                ? <Image src={thumbUrl} alt={alt} width={48} height={48} unoptimized className="h-12 w-12 rounded-lg object-cover hover:opacity-80 transition-opacity" />
                : <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-[10px] text-zinc-500">No img</div>}
        </Link>
    );
}

// ─── PortfolioTableRow ──────────────────────────────────

function PortfolioTableRow({ portfolio, onDeleted }: Readonly<{
    portfolio: Portfolio; onDeleted: () => void;
}>): React.ReactElement {
    const router = useRouter();

    const handleDelete = async (): Promise<void> => {
        if (!globalThis.confirm(`"${portfolio.title}" 포트폴리오를 삭제하시겠습니까?`)) return;
        const res = await fetch("/api/admin/portfolios", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: portfolio.id }) });
        if (res.ok) onDeleted();
    };

    return (
        <tr className="border-b border-white/5 text-sm transition-colors hover:bg-white/[0.02] focus-visible:bg-white/[0.02]">
            <td className="px-4 py-3">
                <PortfolioThumbnail src={portfolio.thumbnail} alt={portfolio.title} portfolioId={portfolio.id} />
            </td>
            <td className="px-4 py-3 font-medium text-white">{portfolio.title}</td>
            <td className="px-4 py-3 text-zinc-400">{portfolio.artist?.title ?? "-"}</td>
            <td className="px-4 py-3 text-zinc-400">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" /> {portfolio.likes_count}</span>
                    <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {portfolio.views_count}</span>
                </div>
            </td>
            <td className="px-4 py-3 text-zinc-400">
                {portfolio.price.toLocaleString()}원
                {portfolio.discount_rate > 0 && <span className="ml-1 text-pink-400">{portfolio.discount_rate}%</span>}
            </td>
            <td className="px-4 py-3 text-xs text-zinc-500">{new Date(portfolio.created_at).toLocaleDateString("ko-KR")}</td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                    <button type="button" aria-label="포트폴리오 수정" className="flex items-center gap-1 rounded-lg bg-purple-500/20 px-3 py-1 text-xs text-purple-400 hover:bg-purple-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-purple-500/30" onClick={() => router.push(`/admin/portfolios/${portfolio.id}/edit`)}>
                        <Pencil className="h-3 w-3" /> 수정
                    </button>
                    <button type="button" aria-label="포트폴리오 삭제" className="rounded-lg bg-red-500/20 p-1.5 text-red-400 hover:bg-red-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-red-500/30" onClick={() => void handleDelete()}>
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </td>
        </tr>
    );
}

// ─── PortfolioTable ─────────────────────────────────────

function PortfolioTable({ portfolios, refetch }: Readonly<{
    portfolios: Portfolio[]; refetch: () => void;
}>): React.ReactElement {
    return (
        <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left">
                <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-xs text-zinc-400">
                        <th className="px-4 py-3 font-medium">이미지</th>
                        <th className="px-4 py-3 font-medium">제목</th>
                        <th className="px-4 py-3 font-medium">아티스트</th>
                        <th className="px-4 py-3 font-medium">반응</th>
                        <th className="px-4 py-3 font-medium">가격</th>
                        <th className="px-4 py-3 font-medium">등록일</th>
                        <th className="px-4 py-3 font-medium">관리</th>
                    </tr>
                </thead>
                <tbody>
                    {portfolios.map((p) => (
                        <PortfolioTableRow key={p.id} portfolio={p} onDeleted={refetch} />
                    ))}
                </tbody>
            </table>
            {portfolios.length === 0 && <p className="py-12 text-center text-sm text-zinc-500">검색 결과가 없습니다.</p>}
        </div>
    );
}

// ─── PortfolioTabs ──────────────────────────────────────

function PortfolioTabs({ activeTab, onChange }: Readonly<{
    activeTab: PortfolioTab;
    onChange: (tab: PortfolioTab) => void;
}>): React.ReactElement {
    return (
        <div className="flex gap-1 rounded-lg bg-white/5 p-1">
            {TAB_LIST.map(({ key, label }) => (
                <button
                    key={key}
                    type="button"
                    aria-pressed={activeTab === key}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        activeTab === key
                            ? "bg-purple-500 text-white"
                            : "text-zinc-400 hover:bg-white/10 hover:text-white focus-visible:bg-white/10"
                    }`}
                    onClick={() => onChange(key)}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}

// ─── PageContent ────────────────────────────────────────

function PageContent({ data, search, tab, setSearch, setPage, setTab, refetch }: Readonly<{
    data: PortfoliosResponse;
    search: string;
    tab: PortfolioTab;
    setSearch: (s: string) => void;
    setPage: (p: number) => void;
    setTab: (t: PortfolioTab) => void;
    refetch: () => void;
}>): React.ReactElement {
    return (
        <div className="min-h-full p-6 pb-40">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <AdminPageHeader title="포트폴리오 관리" count={data.total} />
                <div className="w-full lg:w-96">
                    <AdminSearchBar onSearch={(q) => { setSearch(q); setPage(1); }} placeholder="제목, 활동명, 닉네임, 이메일 검색..." accentColor="purple" />
                </div>
            </div>
            <div className="mb-4 flex items-center gap-3">
                <PortfolioTabs activeTab={tab} onChange={(t) => { setTab(t); setPage(1); }} />
                <AdminSearchResetBadge search={search} onReset={() => { setSearch(""); setPage(1); }} accentColor="purple" />
            </div>
            <div className="mt-4">
                <PortfolioTable portfolios={data.portfolios} refetch={refetch} />
            </div>
            <AdminPagination currentPage={data.page} total={data.total} limit={data.limit} onPageChange={setPage} />
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────

export default function AdminPortfoliosPage(): React.ReactElement {
    const { user, isLoading: authLoading } = useAuth();
    const { data, loading, error, search, tab, setSearch, setPage, setTab, refetch } = usePortfolioList(authLoading, user);

    if (authLoading || (loading && !data)) return <AdminLoadingSpinner accentColor="purple" />;
    if (error) return <AdminErrorState message={error} />;
    if (!data) return <AdminLoadingSpinner accentColor="purple" />;

    return <PageContent data={data} search={search} tab={tab} setSearch={setSearch} setPage={setPage} setTab={setTab} refetch={refetch} />;
}
