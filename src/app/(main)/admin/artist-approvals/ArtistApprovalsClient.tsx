// @client-reason: 검색/페이지네이션/탭(대기·반려됨)/승인·반려 인터랙션 — 초기 데이터는 서버 props, 이후 사용자 액션 시에만 재페칭(useEffect 페칭 없음)
"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { BadgeCheck, XCircle, RefreshCw, Eye } from "lucide-react";

import {
  AdminSearchBar,
  AdminPagination,
  AdminSearchResetBadge,
  AdminLoadingSpinner,
  AdminPageHeader,
} from "@/components/admin/admin-shared";
import type { ArtistApprovalItem, ArtistApprovalsResult, ApprovalStatus } from "@/lib/supabase/artist-approval-queries";
import { RejectShopModal, type RejectTarget } from "./RejectShopModal";

// ─── Data Hook (인터랙션 기반 페칭 — useEffect 미사용) ──────

function useApprovalList(initial: ArtistApprovalsResult): {
  data: ArtistApprovalsResult; loading: boolean; search: string; status: ApprovalStatus;
  setSearch: (s: string) => void; setPage: (p: number) => void;
  setStatus: (s: ApprovalStatus) => void; refetch: () => void;
} {
  const [data, setData] = useState<ArtistApprovalsResult>(initial);
  const [loading, setLoading] = useState(false);
  const [search, setSearchState] = useState("");
  const [status, setStatusState] = useState<ApprovalStatus>("pending");

  const load = useCallback(async (page: number, searchTerm: string, st: ApprovalStatus) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (searchTerm) params.set("search", searchTerm);
      if (st === "rejected") params.set("status", "rejected");
      const res = await fetch(`/api/admin/artist-approvals?${params.toString()}`);
      if (res.ok) setData(await res.json() as ArtistApprovalsResult);
    } catch {
      /* 네트워크/파싱 오류 — 기존 데이터 유지, 무한 로딩 방지(finally 에서 해제) */
    } finally {
      setLoading(false);
    }
  }, []);

  const setSearch = useCallback((s: string) => { setSearchState(s); void load(1, s, status); }, [load, status]);
  const setPage = useCallback((p: number) => { void load(p, search, status); }, [load, search, status]);
  // 탭 전환: 1페이지로, 현재 검색어 유지(AdminSearchBar 내부 입력 상태와 desync 방지).
  // deps 는 [load, search] 로 완전 — 콜백은 status 상태가 아니라 인자 st 를 쓴다(status 의존 없음). status 추가 금지.
  const setStatus = useCallback((st: ApprovalStatus) => { setStatusState(st); void load(1, search, st); }, [load, search]);
  const refetch = useCallback(() => { void load(data.page, search, status); }, [load, data.page, search, status]);

  return { data, loading, search, status, setSearch, setPage, setStatus, refetch };
}

// ─── Actions ────────────────────────────────────────────

async function approveArtist(id: string): Promise<boolean> {
  const res = await fetch("/api/admin/artist-approvals", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, action: "approve" }),
  });
  return res.ok;
}

async function rejectArtist(id: string, reason: string): Promise<boolean> {
  const res = await fetch("/api/admin/artist-approvals", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, action: "reject", reason }),
  });
  return res.ok;
}

// ─── Helpers ────────────────────────────────────────────

function formatDate(v: string | null): string {
  if (!v) return "-";
  return new Date(v).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
}

const ACTION_BTN = "flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function ShopPreviewLink({ id, title }: Readonly<{ id: string; title: string }>): React.ReactElement {
  return (
    <Link
      href={`/admin-shop-preview/${id}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${title} 샵 미리보기 (새 탭에서 열림)`}
      className={`${ACTION_BTN} text-sky-400 hover:bg-sky-500/10 focus-visible:bg-sky-500/10`}
    >
      <Eye className="h-3.5 w-3.5" aria-hidden="true" /> 샵 보기
    </Link>
  );
}

const TH_CLASS = "px-3 py-2.5 text-xs font-medium text-zinc-400";

// 승인/반려 테이블 공용 헤더 — 컬럼 라벨만 다르다.
function ApprovalTableHead({ labels }: Readonly<{ labels: readonly string[] }>): React.ReactElement {
  return (
    <thead className="border-b border-white/10 bg-white/5">
      <tr>{labels.map((l) => <th key={l} className={TH_CLASS}>{l}</th>)}</tr>
    </thead>
  );
}

// ─── Tabs ───────────────────────────────────────────────

const TABS: { key: ApprovalStatus; label: string }[] = [
  { key: "pending", label: "승인 대기" },
  { key: "rejected", label: "반려됨" },
];

function ApprovalTabs({ status, onChange }: Readonly<{
  status: ApprovalStatus; onChange: (s: ApprovalStatus) => void;
}>): React.ReactElement {
  return (
    <div role="group" aria-label="승인 상태 필터" className="inline-flex rounded-lg border border-white/10 bg-white/5 p-1">
      {TABS.map((t) => {
        const active = status === t.key;
        return (
          <button
            key={t.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(t.key)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              active
                ? "bg-brand-primary text-white"
                : "text-zinc-400 hover:bg-white/5 hover:text-white focus-visible:bg-white/5 focus-visible:text-white"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Pending: Table Row ─────────────────────────────────

function ApprovalRow({ artist, onApprove, onReject }: Readonly<{
  artist: ArtistApprovalItem; onApprove: () => void; onReject: () => void;
}>): React.ReactElement {
  return (
    <tr className="border-b border-white/5 align-top hover:bg-white/5 focus-within:bg-white/5">
      <td className="px-3 py-3 text-sm text-white">
        <div className="flex items-center gap-1.5 font-medium">
          {artist.title}
          {artist.isResubmit && (
            <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
              <RefreshCw className="h-2.5 w-2.5" /> 재신청
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-zinc-500">{artist.nickname}</div>
        {artist.prevRejectReason && (
          <div className="mt-1 whitespace-pre-line text-[11px] text-red-400">이전 반려: {artist.prevRejectReason}</div>
        )}
      </td>
      <td className="px-3 py-3 text-sm text-zinc-400">{artist.contact}</td>
      <td className="px-3 py-3 text-sm text-zinc-400">{artist.address}</td>
      <td className="max-w-xs px-3 py-3 text-xs text-zinc-400">
        <p className="line-clamp-3 whitespace-pre-line">{artist.introduce}</p>
      </td>
      <td className="px-3 py-3 text-sm text-zinc-400">{formatDate(artist.createdAt)}</td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-1.5">
          <ShopPreviewLink id={artist.id} title={artist.title} />
          <button type="button" onClick={onApprove} aria-label={`${artist.title} 샵 승인`}
            className={`${ACTION_BTN} text-green-400 hover:bg-green-500/10 focus-visible:bg-green-500/10`}>
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> 승인
          </button>
          <button type="button" onClick={onReject} aria-label={`${artist.title} 샵 반려`}
            className={`${ACTION_BTN} text-red-400 hover:bg-red-500/10 focus-visible:bg-red-500/10`}>
            <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> 반려
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Pending: Table ─────────────────────────────────────

function ApprovalTable({ artists, onRefetch, onRequestReject }: Readonly<{
  artists: ArtistApprovalItem[]; onRefetch: () => void; onRequestReject: (a: ArtistApprovalItem) => void;
}>): React.ReactElement {
  const handleApprove = async (a: ArtistApprovalItem): Promise<void> => {
    if (!globalThis.confirm(`"${a.title}" 샵을 승인하시겠습니까? 승인 즉시 검색·추천에 노출됩니다.`)) return;
    const ok = await approveArtist(a.id);
    if (ok) onRefetch();
    else globalThis.alert("승인에 실패했습니다. 이미 처리되었을 수 있습니다.");
  };

  if (artists.length === 0) {
    return <p className="py-12 text-center text-sm text-zinc-500">승인 대기 중인 샵이 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-left">
        <ApprovalTableHead labels={["샵 / 신청자", "연락처", "주소", "소개", "신청일", "관리"]} />
        <tbody>
          {artists.map((a) => (
            <ApprovalRow
              key={a.id}
              artist={a}
              onApprove={() => void handleApprove(a)}
              onReject={() => onRequestReject(a)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Rejected: Table (보기 전용 — 진행 추적) ───────────────

function RejectedRow({ artist }: Readonly<{ artist: ArtistApprovalItem }>): React.ReactElement {
  return (
    <tr className="border-b border-white/5 align-top hover:bg-white/5 focus-within:bg-white/5">
      <td className="px-3 py-3 text-sm text-white">
        <div className="font-medium">{artist.title}</div>
        <div className="mt-0.5 text-xs text-zinc-500">{artist.nickname}</div>
      </td>
      <td className="px-3 py-3 text-sm text-zinc-400">{artist.contact}</td>
      <td className="px-3 py-3 text-sm text-zinc-400">{artist.address}</td>
      <td className="max-w-xs px-3 py-3 text-xs text-red-300">
        <p className="whitespace-pre-line">{artist.prevRejectReason ?? "-"}</p>
      </td>
      <td className="px-3 py-3 text-sm text-zinc-400">{formatDate(artist.rejectedAt)}</td>
      <td className="px-3 py-3">
        <ShopPreviewLink id={artist.id} title={artist.title} />
      </td>
    </tr>
  );
}

function RejectedTable({ artists }: Readonly<{ artists: ArtistApprovalItem[] }>): React.ReactElement {
  if (artists.length === 0) {
    return <p className="py-12 text-center text-sm text-zinc-500">반려된 샵이 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-left">
        <ApprovalTableHead labels={["샵 / 신청자", "연락처", "주소", "반려 사유", "반려일", "관리"]} />
        <tbody>
          {artists.map((a) => <RejectedRow key={a.id} artist={a} />)}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────

export function ArtistApprovalsClient({ initial }: Readonly<{ initial: ArtistApprovalsResult }>): React.ReactElement {
  const { data, loading, search, status, setSearch, setPage, setStatus, refetch } = useApprovalList(initial);
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const isPending = status === "pending";

  const handleConfirmReject = useCallback(async (reason: string): Promise<boolean> => {
    if (!rejectTarget) return false;
    const ok = await rejectArtist(rejectTarget.id, reason);
    if (ok) refetch();
    return ok;
  }, [rejectTarget, refetch]);

  function renderList(): React.ReactElement {
    if (loading) return <AdminLoadingSpinner accentColor="purple" />;
    if (isPending) {
      return (
        <ApprovalTable
          artists={data.artists}
          onRefetch={refetch}
          onRequestReject={(a) => setRejectTarget({ id: a.id, title: a.title })}
        />
      );
    }
    return <RejectedTable artists={data.artists} />;
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <AdminPageHeader title={isPending ? "샵 승인 대기" : "반려된 샵"} count={data.total} />
      {isPending ? (
        <p className="text-xs text-zinc-500">신규 등록 샵은 관리자 승인 후 정식 오픈됩니다. <b className="text-sky-400">샵 보기</b>로 꾸밈(배너·포트폴리오·소개)을 검수한 뒤 승인 시 검색·추천 노출 + 즉시 색인, 반려 시 선택한 사유가 신청자에게 전달됩니다.</p>
      ) : (
        <p className="text-xs text-zinc-500">반려된 샵 목록입니다. 신청자가 마이페이지에서 수정·재신청하면 자동으로 <b className="text-sky-400">승인 대기</b> 탭에 <b className="text-amber-300">재신청</b>으로 올라옵니다. <b className="text-sky-400">샵 보기</b>로 현재 데이터를 확인하세요.</p>
      )}

      <ApprovalTabs status={status} onChange={setStatus} />

      <AdminSearchBar onSearch={setSearch} placeholder="샵명 검색..." accentColor="purple" />
      <AdminSearchResetBadge search={search} onReset={() => setSearch("")} accentColor="purple" />

      {renderList()}

      <AdminPagination currentPage={data.page} total={data.total} limit={data.limit} onPageChange={setPage} />

      <RejectShopModal
        shop={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleConfirmReject}
      />
    </div>
  );
}
