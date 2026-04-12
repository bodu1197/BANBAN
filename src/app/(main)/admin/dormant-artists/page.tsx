// @client-reason: Admin dormant artist management with search, pagination, actions
"use client";

import { useState, useCallback, useEffect } from "react";
import { UserCheck, Scan, ArrowUpDown } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import {
  AdminSearchBar,
  AdminPagination,
  AdminSearchResetBadge,
  AdminLoadingSpinner,
  AdminErrorState,
  AdminPageHeader,
} from "@/components/admin/admin-shared";

// ─── Types ──────────────────────────────────────────────

interface DormantArtist {
  id: string;
  userId: string;
  title: string;
  nickname: string;
  portfolioCount: number;
  dormantSince: string;
  createdAt: string;
  lastLoginAt: string | null;
}

interface DormantResponse {
  artists: DormantArtist[];
  total: number;
  page: number;
  limit: number;
}

type SortKey = "" | "last_login_at_asc" | "last_login_at_desc";

// ─── Data Hook ──────────────────────────────────────────

function useDormantList(): {
  data: DormantResponse | null; loading: boolean; error: string | null;
  search: string; page: number; sort: SortKey;
  setSearch: (s: string) => void; setPage: (p: number) => void;
  setSort: (s: SortKey) => void; refetch: () => void;
} {
  const [data, setData] = useState<DormantResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearchState] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortKey>("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);
    if (sort) params.set("sort", sort);
    const res = await fetch(`/api/admin/dormant-artists?${params.toString()}`);
    if (res.status === 403) { setError("접근 권한이 없습니다."); setLoading(false); return; }
    if (!res.ok) { setError("데이터를 불러올 수 없습니다."); setLoading(false); return; }
    setData(await res.json() as DormantResponse);
    setError(null);
    setLoading(false);
  }, [search, page, sort]);

  const setSearch = (s: string): void => { setSearchState(s); setPage(1); };

  return { data, loading, error, search, page, sort, setSearch, setPage, setSort, refetch: fetchData };
}

// ─── Actions ────────────────────────────────────────────

async function reactivateArtist(id: string): Promise<boolean> {
  const res = await fetch("/api/admin/dormant-artists", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, action: "reactivate" }),
  });
  return res.ok;
}

async function scanDormant(): Promise<number> {
  const res = await fetch("/api/admin/dormant-artists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "scan" }),
  });
  if (!res.ok) return -1;
  const data = await res.json() as { marked: number };
  return data.marked;
}

// ─── Helpers ────────────────────────────────────────────

function formatDate(v: string | null): string {
  if (!v) return "-";
  return new Date(v).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
}

// ─── Sortable Header ────────────────────────────────────

function SortableHeader({ label, active, onToggle }: Readonly<{
  label: string; active: boolean; onToggle: () => void;
}>): React.ReactElement {
  return (
    <th className="px-3 py-2.5 text-xs font-medium text-zinc-400">
      <button type="button" onClick={onToggle}
        className={`flex items-center gap-1 transition-colors hover:text-white focus-visible:outline-none focus-visible:text-white ${active ? "text-purple-400" : ""}`}>
        {label} <ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  );
}

// ─── Table Row ──────────────────────────────────────────

function DormantRow({ artist, onReactivate }: Readonly<{
  artist: DormantArtist; onReactivate: () => void;
}>): React.ReactElement {
  return (
    <tr className="border-b border-white/5 hover:bg-white/5 focus-visible:bg-white/5">
      <td className="px-3 py-3 text-sm text-white">{artist.title}</td>
      <td className="px-3 py-3 text-sm text-zinc-400">{artist.nickname}</td>
      <td className="px-3 py-3 text-sm text-zinc-400">{artist.portfolioCount}</td>
      <td className="px-3 py-3 text-sm text-zinc-400">{formatDate(artist.lastLoginAt)}</td>
      <td className="px-3 py-3 text-sm text-zinc-400">{formatDate(artist.dormantSince)}</td>
      <td className="px-3 py-3 text-sm text-zinc-400">{formatDate(artist.createdAt)}</td>
      <td className="px-3 py-3">
        <button type="button" onClick={onReactivate} aria-label="휴면 해제"
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-green-400 transition-colors hover:bg-green-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-green-500/10">
          <UserCheck className="h-3.5 w-3.5" /> 해제
        </button>
      </td>
    </tr>
  );
}

// ─── Table ──────────────────────────────────────────────

function DormantTable({ artists, sort, onSort, onRefetch }: Readonly<{
  artists: DormantArtist[]; sort: SortKey; onSort: (s: SortKey) => void; onRefetch: () => void;
}>): React.ReactElement {
  const handleReactivate = async (a: DormantArtist): Promise<void> => {
    if (!globalThis.confirm(`"${a.title}" 아티스트를 휴면 해제하시겠습니까?`)) return;
    const ok = await reactivateArtist(a.id);
    if (ok) onRefetch();
  };

  const toggleSort = (): void => {
    const next: SortKey = sort === "last_login_at_desc" ? "last_login_at_asc" : "last_login_at_desc";
    onSort(next);
  };

  if (artists.length === 0) {
    return <p className="py-12 text-center text-sm text-zinc-500">휴면 아티스트가 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-left">
        <DormantTableHead sort={sort} onToggleSort={toggleSort} />
        <tbody>
          {artists.map((a) => (
            <DormantRow key={a.id} artist={a} onReactivate={() => void handleReactivate(a)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DormantTableHead({ sort, onToggleSort }: Readonly<{
  sort: SortKey; onToggleSort: () => void;
}>): React.ReactElement {
  return (
    <thead className="border-b border-white/10 bg-white/5">
      <tr>
        <th className="px-3 py-2.5 text-xs font-medium text-zinc-400">아티스트명</th>
        <th className="px-3 py-2.5 text-xs font-medium text-zinc-400">닉네임</th>
        <th className="px-3 py-2.5 text-xs font-medium text-zinc-400">포트폴리오</th>
        <SortableHeader label="최종 로그인" active={sort !== ""} onToggle={onToggleSort} />
        <th className="px-3 py-2.5 text-xs font-medium text-zinc-400">휴면 일자</th>
        <th className="px-3 py-2.5 text-xs font-medium text-zinc-400">가입일</th>
        <th className="px-3 py-2.5 text-xs font-medium text-zinc-400">관리</th>
      </tr>
    </thead>
  );
}

// ─── Scan Button ────────────────────────────────────────

function ScanButton({ onComplete }: Readonly<{ onComplete: () => void }>): React.ReactElement {
  const [scanning, setScanning] = useState(false);

  const handleScan = async (): Promise<void> => {
    setScanning(true);
    const count = await scanDormant();
    setScanning(false);
    if (count >= 0) {
      alert(`${count}명의 아티스트가 휴면 처리되었습니다.`);
      onComplete();
    } else {
      alert("스캔에 실패했습니다.");
    }
  };

  return (
    <button type="button" onClick={() => void handleScan()} disabled={scanning}
      className="flex items-center gap-1.5 rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-purple-600 disabled:opacity-50">
      <Scan className="h-4 w-4" />
      {scanning ? "스캔 중..." : "휴면 스캔 실행"}
    </button>
  );
}

// ─── Page Content ───────────────────────────────────────

function PageContent({ data, search, page, sort, setSearch, setPage, setSort, refetch }: Readonly<{
  data: DormantResponse; search: string; page: number; sort: SortKey;
  setSearch: (s: string) => void; setPage: (p: number) => void;
  setSort: (s: SortKey) => void; refetch: () => void;
}>): React.ReactElement {
  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <AdminPageHeader title="휴면 계정 관리" count={data.total} />
        <ScanButton onComplete={refetch} />
      </div>
      <p className="text-xs text-zinc-500">포트폴리오 0개 또는 3개월 미접속 아티스트는 휴면 처리됩니다. 로그인 시 자동 해제됩니다.</p>
      <AdminSearchBar onSearch={setSearch} placeholder="아티스트명 검색..." accentColor="purple" />
      <AdminSearchResetBadge search={search} onReset={() => setSearch("")} accentColor="purple" />
      <DormantTable artists={data.artists} sort={sort} onSort={setSort} onRefetch={refetch} />
      <AdminPagination currentPage={page} total={data.total} limit={data.limit} onPageChange={setPage} />
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────

export default function AdminDormantArtistsPage(): React.ReactElement {
  const { user, isLoading: authLoading } = useAuth();
  const { data, loading, error, search, page, sort, setSearch, setPage, setSort, refetch } = useDormantList();

  useEffect(() => {
    if (!authLoading && user) refetch();
  }, [authLoading, user, refetch]);

  if (authLoading || loading) return <AdminLoadingSpinner accentColor="purple" />;
  if (error) return <AdminErrorState message={error} />;
  if (!data) return <AdminLoadingSpinner accentColor="purple" />;

  return <PageContent data={data} search={search} page={page} sort={sort} setSearch={setSearch} setPage={setPage} setSort={setSort} refetch={refetch} />;
}
