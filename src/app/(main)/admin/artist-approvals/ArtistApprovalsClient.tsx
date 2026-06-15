// @client-reason: 검색/페이지네이션/점검 인터랙션 — 초기 데이터는 서버 props, 이후 사용자 액션 시에만 재페칭(useEffect 페칭 없음)
"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { BadgeCheck, XCircle, RefreshCw, Eye, EyeOff, RotateCcw, Check } from "lucide-react";

import {
  AdminSearchBar,
  AdminPagination,
  AdminSearchResetBadge,
  AdminLoadingSpinner,
  AdminPageHeader,
} from "@/components/admin/admin-shared";
import type { ArtistApprovalItem, ArtistApprovalsResult, ApprovalStatus, QueueFilter } from "@/lib/supabase/artist-approval-queries";
import { REQUIRED_PORTFOLIOS } from "@/lib/artist-status";
import { RejectShopModal, type RejectTarget } from "./RejectShopModal";

// ─── Data Hook (인터랙션 기반 페칭 — useEffect 미사용) ──────

function useApprovalList(initial: ArtistApprovalsResult): {
  data: ArtistApprovalsResult; loading: boolean; search: string; filter: QueueFilter;
  setSearch: (s: string) => void; setPage: (p: number) => void; setFilter: (f: QueueFilter) => void; refetch: () => void;
} {
  const [data, setData] = useState<ArtistApprovalsResult>(initial);
  const [loading, setLoading] = useState(false);
  const [search, setSearchState] = useState("");
  const [filter, setFilterState] = useState<QueueFilter>("all");

  const load = useCallback(async (page: number, searchTerm: string, filterVal: QueueFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), filter: filterVal });
      if (searchTerm) params.set("search", searchTerm);
      const res = await fetch(`/api/admin/artist-approvals?${params.toString()}`);
      if (res.ok) setData(await res.json() as ArtistApprovalsResult);
    } catch {
      /* 네트워크/파싱 오류 — 기존 데이터 유지, 무한 로딩 방지(finally 에서 해제) */
    } finally {
      setLoading(false);
    }
  }, []);

  const setSearch = useCallback((s: string) => { setSearchState(s); void load(1, s, filter); }, [load, filter]);
  const setPage = useCallback((p: number) => { void load(p, search, filter); }, [load, search, filter]);
  const setFilter = useCallback((f: QueueFilter) => { setFilterState(f); void load(1, search, f); }, [load, search]);
  const refetch = useCallback(() => { void load(data.page, search, filter); }, [load, data.page, search, filter]);

  return { data, loading, search, filter, setSearch, setPage, setFilter, refetch };
}

// ─── Actions ────────────────────────────────────────────

async function patchAction(id: string, action: string, reason?: string): Promise<boolean> {
  const res = await fetch("/api/admin/artist-approvals", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, action, reason }),
  });
  return res.ok;
}

// ─── Helpers ────────────────────────────────────────────

function formatDate(v: string | null): string {
  if (!v) return "-";
  return new Date(v).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
}

const ACTION_BTN = "flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const FAIL_MSG = "처리에 실패했습니다. 이미 처리되었을 수 있습니다.";

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

function ApprovalTableHead({ labels }: Readonly<{ labels: readonly string[] }>): React.ReactElement {
  return (
    <thead className="border-b border-white/10 bg-white/5">
      <tr>{labels.map((l) => <th key={l} className={TH_CLASS}>{l}</th>)}</tr>
    </thead>
  );
}

const BADGE_CLASS = "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold";

// Record<ApprovalStatus, …> — 새 상태 추가 시 누락을 컴파일 타임에 강제.
const STATUS_BADGE: Record<ApprovalStatus, { label: string; cls: string }> = {
  published: { label: "점검 필요", cls: "bg-sky-500/15 text-sky-300" },
  active: { label: "공개중", cls: "bg-emerald-500/15 text-emerald-300" },
  hidden: { label: "숨김됨", cls: "bg-zinc-500/15 text-zinc-300" },
  pending: { label: "승인 대기", cls: "bg-amber-500/15 text-amber-300" },
  rejected: { label: "반려됨", cls: "bg-red-500/15 text-red-300" },
};

// 줄 단위 상태 뱃지: 점검 필요 / 공개중 / 숨김됨 / 승인 대기(레거시) / 반려됨 (+ 재신청 표식).
function StatusBadge({ artist }: Readonly<{ artist: ArtistApprovalItem }>): React.ReactElement {
  const { label, cls } = STATUS_BADGE[artist.status];
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`${BADGE_CLASS} ${cls}`}>{label}</span>
      {artist.status === "pending" && artist.isResubmit ? (
        <span className={`${BADGE_CLASS} bg-amber-500/15 text-amber-300`}>
          <RefreshCw className="h-2.5 w-2.5" aria-hidden="true" /> 재신청
        </span>
      ) : null}
      {artist.status === "hidden" && artist.isResubmit ? (
        <span className={`${BADGE_CLASS} bg-amber-500/15 text-amber-300`}>
          <RefreshCw className="h-2.5 w-2.5" aria-hidden="true" /> 재검토 요청됨
        </span>
      ) : null}
    </span>
  );
}

// 반려 사유 안내: 반려됨이면 사유+반려일, 재신청이면 직전 반려 사유.
function RejectNote({ artist }: Readonly<{ artist: ArtistApprovalItem }>): React.ReactElement | null {
  if (artist.status === "rejected") {
    return (
      <div className="mt-1 whitespace-pre-line text-[11px] text-red-400">
        반려({formatDate(artist.rejectedAt)}): {artist.prevRejectReason ?? "-"}
      </div>
    );
  }
  if (artist.status === "pending" && artist.isResubmit && artist.prevRejectReason) {
    return <div className="mt-1 whitespace-pre-line text-[11px] text-red-400">이전 반려: {artist.prevRejectReason}</div>;
  }
  if (artist.status === "hidden" && artist.prevRejectReason) {
    return <div className="mt-1 whitespace-pre-line text-[11px] text-amber-400">비공개 사유: {artist.prevRejectReason}</div>;
  }
  return null;
}

// ─── Row Actions (상태별 버튼) ───────────────────────────

interface RowActionHandlers {
  onConfirm: () => void;
  onTakedown: () => void;
  onRestore: () => void;
  onRejectReReview: () => void;
  onApprove: () => void;
  onReject: () => void;
}

// 숨김(테이크다운) 버튼 — 점검 필요/공개중 양쪽에서 재사용. 클릭 시 사유 입력 모달이 열린다.
function TakedownButton({ title, onClick }: Readonly<{ title: string; onClick: () => void }>): React.ReactElement {
  return (
    <button type="button" onClick={onClick} aria-label={`${title} 샵 숨김(테이크다운)`}
      className={`${ACTION_BTN} text-amber-400 hover:bg-amber-500/10 focus-visible:bg-amber-500/10`}>
      <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> 숨김
    </button>
  );
}

function RowActions({ artist, h }: Readonly<{ artist: ArtistApprovalItem; h: RowActionHandlers }>): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-1.5">
      <ShopPreviewLink id={artist.id} title={artist.title} />
      {artist.status === "published" ? (
        <>
          <button type="button" onClick={h.onConfirm} aria-label={`${artist.title} 점검 완료`}
            className={`${ACTION_BTN} text-green-400 hover:bg-green-500/10 focus-visible:bg-green-500/10`}>
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> 확인
          </button>
          <TakedownButton title={artist.title} onClick={h.onTakedown} />
        </>
      ) : null}
      {artist.status === "active" ? <TakedownButton title={artist.title} onClick={h.onTakedown} /> : null}
      {artist.status === "hidden" ? (
        <>
          <button type="button" onClick={h.onRestore} aria-label={`${artist.title} 샵 ${artist.isResubmit ? "합격 복구" : "복구"}`}
            className={`${ACTION_BTN} text-sky-400 hover:bg-sky-500/10 focus-visible:bg-sky-500/10`}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> {artist.isResubmit ? "합격(복구)" : "복구"}
          </button>
          {artist.isResubmit ? (
            <button type="button" onClick={h.onRejectReReview} aria-label={`${artist.title} 재검토 불합격`}
              className={`${ACTION_BTN} text-red-400 hover:bg-red-500/10 focus-visible:bg-red-500/10`}>
              <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> 불합격
            </button>
          ) : null}
        </>
      ) : null}
      {artist.status === "pending" ? (
        <>
          <button type="button" onClick={h.onApprove} aria-label={`${artist.title} 샵 승인`}
            className={`${ACTION_BTN} text-green-400 hover:bg-green-500/10 focus-visible:bg-green-500/10`}>
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> 승인
          </button>
          <button type="button" onClick={h.onReject} aria-label={`${artist.title} 샵 반려`}
            className={`${ACTION_BTN} text-red-400 hover:bg-red-500/10 focus-visible:bg-red-500/10`}>
            <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> 반려
          </button>
        </>
      ) : null}
    </div>
  );
}

// ─── Table Row ──────────────────────────────────────────

function ApprovalRow({ artist, h }: Readonly<{ artist: ArtistApprovalItem; h: RowActionHandlers }>): React.ReactElement {
  return (
    <tr className="border-b border-white/5 align-top hover:bg-white/5 focus-within:bg-white/5">
      <td className="px-3 py-3 text-sm text-white">
        <div className="flex items-center gap-1.5 font-medium">
          {artist.title}
          <StatusBadge artist={artist} />
        </div>
        <div className="mt-0.5 text-xs text-zinc-500">{artist.nickname}</div>
        <RejectNote artist={artist} />
      </td>
      <td className="px-3 py-3 text-sm text-zinc-400">{artist.contact}</td>
      <td className="px-3 py-3 text-sm text-zinc-400">{artist.address}</td>
      <td className="max-w-xs px-3 py-3 text-xs text-zinc-400">
        <p className="line-clamp-3 whitespace-pre-line">{artist.introduce}</p>
      </td>
      <td className="px-3 py-3 text-sm text-zinc-400">{formatDate(artist.approvedAt ?? artist.createdAt)}</td>
      <td className="px-3 py-3"><RowActions artist={artist} h={h} /></td>
    </tr>
  );
}

// ─── Table ──────────────────────────────────────────────

function ApprovalTable({ artists, onRefetch, onRequestReject, onRequestTakedown, onRequestRejectReReview }: Readonly<{
  artists: ArtistApprovalItem[]; onRefetch: () => void;
  onRequestReject: (a: ArtistApprovalItem) => void;
  onRequestTakedown: (a: ArtistApprovalItem) => void;
  onRequestRejectReReview: (a: ArtistApprovalItem) => void;
}>): React.ReactElement {
  const run = async (ok: Promise<boolean>, failMsg = FAIL_MSG): Promise<void> => {
    if (await ok) onRefetch();
    else globalThis.alert(failMsg);
  };
  const handleConfirm = (a: ArtistApprovalItem): void => {
    if (!globalThis.confirm(`"${a.title}" 샵을 점검 완료(이상 없음) 처리할까요?`)) return;
    void run(patchAction(a.id, "confirm"));
  };
  const handleRestore = (a: ArtistApprovalItem): void => {
    if (!globalThis.confirm(`"${a.title}" 샵을 다시 공개할까요?`)) return;
    void run(patchAction(a.id, "restore"));
  };
  const handleApprove = (a: ArtistApprovalItem): void => {
    if (!globalThis.confirm(`"${a.title}" 샵을 승인하시겠습니까? 승인 즉시 검색·추천에 노출됩니다.`)) return;
    void run(patchAction(a.id, "approve"), "승인에 실패했습니다. 이미 처리되었을 수 있습니다.");
  };

  if (artists.length === 0) {
    return <p className="py-12 text-center text-sm text-zinc-500">조건에 맞는 샵이 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-left">
        <ApprovalTableHead labels={["샵 / 운영자", "연락처", "주소", "소개", "공개·등록일", "관리"]} />
        <tbody>
          {artists.map((a) => (
            <ApprovalRow
              key={a.id}
              artist={a}
              h={{
                onConfirm: () => handleConfirm(a),
                onTakedown: () => onRequestTakedown(a),
                onRestore: () => handleRestore(a),
                onRejectReReview: () => onRequestRejectReReview(a),
                onApprove: () => handleApprove(a),
                onReject: () => onRequestReject(a),
              }}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Filter Tabs (상태별 빠른 찾기) ─────────────────────────

const FILTER_TABS: readonly { key: QueueFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "rereview", label: "재검토 요청" },
  { key: "published", label: "점검 필요" },
  { key: "active", label: "공개중" },
  { key: "hidden", label: "숨김중" },
];

function FilterTabs({ filter, counts, onSelect }: Readonly<{
  filter: QueueFilter; counts: Record<QueueFilter, number>; onSelect: (f: QueueFilter) => void;
}>): React.ReactElement {
  // 토글 버튼 그룹(aria-pressed) — tablist 의 화살표키 내비 요구 없이 각 버튼이 독립 포커스·동작.
  return (
    <div role="group" aria-label="샵 상태 필터" className="flex flex-wrap gap-1.5">
      {FILTER_TABS.map((t) => {
        const on = filter === t.key;
        return (
          <button
            key={t.key}
            type="button"
            aria-pressed={on}
            onClick={() => onSelect(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              on
                ? "bg-brand-primary text-white"
                : "border border-white/15 text-zinc-300 hover:bg-white/5 hover:text-white focus-visible:bg-white/5 focus-visible:text-white"
            }`}
          >
            {t.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${on ? "bg-white/20" : "bg-white/15 text-zinc-300"}`}>
              {counts[t.key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────

export function ArtistApprovalsClient({ initial }: Readonly<{ initial: ArtistApprovalsResult }>): React.ReactElement {
  const { data, loading, search, filter, setSearch, setPage, setFilter, refetch } = useApprovalList(initial);
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [takedownTarget, setTakedownTarget] = useState<RejectTarget | null>(null);
  const [reReviewTarget, setReReviewTarget] = useState<RejectTarget | null>(null);

  const handleConfirmReject = useCallback(async (reason: string): Promise<boolean> => {
    if (!rejectTarget) return false;
    const ok = await patchAction(rejectTarget.id, "reject", reason);
    if (ok) refetch();
    return ok;
  }, [rejectTarget, refetch]);

  const handleConfirmTakedown = useCallback(async (reason: string): Promise<boolean> => {
    if (!takedownTarget) return false;
    const ok = await patchAction(takedownTarget.id, "takedown", reason);
    if (ok) refetch();
    return ok;
  }, [takedownTarget, refetch]);

  const handleConfirmReReviewReject = useCallback(async (reason: string): Promise<boolean> => {
    if (!reReviewTarget) return false;
    const ok = await patchAction(reReviewTarget.id, "reject_rereview", reason);
    if (ok) refetch();
    return ok;
  }, [reReviewTarget, refetch]);

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <AdminPageHeader title="샵 점검 관리" count={data.total} />
      <p className="text-xs text-zinc-500">
        샵은 등록 기준(배너+작품 {REQUIRED_PORTFOLIOS}개) 충족 시 <b className="text-sky-400">자동 공개</b>됩니다. 여기서 사후로 점검·관리하세요. {" "}
        <b className="text-amber-300">재검토 요청됨</b>(운영자가 숨김 후 수정·재요청)은 <b>맨 위에</b> 표시됩니다 — 확인 후 <b className="text-sky-400">합격(복구)</b> 또는 <b className="text-red-400">불합격</b>(사유 통보·숨김 유지) 처리하세요. {" "}
        <b className="text-sky-400">점검 필요</b>는 새로 공개된 샵 — <b className="text-green-400">확인</b>(이상 없음) 또는 <b className="text-amber-300">숨김</b>. {" "}
        <b className="text-emerald-300">공개중</b>인 샵도 문제가 있으면 <b className="text-amber-300">숨김</b>(사유 입력 필수 → 운영자에게 전달)으로 언제든 비공개 처리할 수 있고, {" "}
        <b className="text-zinc-300">숨김됨</b>은 <b className="text-sky-400">복구</b> 가능합니다. <b className="text-sky-400">샵 보기</b>로 실제 데이터를 확인하세요.
      </p>

      <FilterTabs filter={filter} counts={data.tabCounts} onSelect={setFilter} />

      <AdminSearchBar onSearch={setSearch} placeholder="샵명 검색..." accentColor="purple" />
      <AdminSearchResetBadge search={search} onReset={() => setSearch("")} accentColor="purple" />

      {loading
        ? <AdminLoadingSpinner accentColor="purple" />
        : <ApprovalTable
            artists={data.artists}
            onRefetch={refetch}
            onRequestReject={(a) => setRejectTarget({ id: a.id, title: a.title })}
            onRequestTakedown={(a) => setTakedownTarget({ id: a.id, title: a.title })}
            onRequestRejectReReview={(a) => setReReviewTarget({ id: a.id, title: a.title })}
          />}

      <AdminPagination currentPage={data.page} total={data.total} limit={data.limit} onPageChange={setPage} />

      <RejectShopModal
        shop={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleConfirmReject}
      />
      <RejectShopModal
        shop={takedownTarget}
        onClose={() => setTakedownTarget(null)}
        onConfirm={handleConfirmTakedown}
        heading="샵 비공개 처리"
        description="비공개(숨김) 사유를 선택하거나 작성하세요. 운영자에게 전달되어 수정·재검토 요청에 사용됩니다."
        submitLabel="비공개 처리"
        submitAccent="amber"
      />
      <RejectShopModal
        shop={reReviewTarget}
        onClose={() => setReReviewTarget(null)}
        onConfirm={handleConfirmReReviewReject}
        heading="재검토 불합격"
        description="아직 공개 기준에 미달하는 사유를 선택하거나 작성하세요. 운영자에게 전달되며, 샵은 비공개로 유지됩니다. 운영자가 수정 후 다시 재검토를 요청할 수 있습니다."
        submitLabel="불합격 처리"
        submitAccent="red"
      />
    </div>
  );
}
