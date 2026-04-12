// @client-reason: Admin entry management with approve/reject/delete actions and data fetching
"use client";
/* eslint-disable max-lines-per-function */

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Check, X, Trash2, ArrowLeft, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { AdminLoadingSpinner } from "@/components/admin/admin-shared";
import { getStorageUrl, getAvatarUrl } from "@/lib/supabase/storage-utils";

// ─── Types ───────────────────────────────────────────────

interface PortfolioMedia { storage_path: string; order_index: number }

interface EntryItem {
  id: string;
  exhibition_id: string;
  portfolio_id: string;
  artist_id: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  portfolios: {
    title: string | null;
    description: string | null;
    price_origin: number | null;
    price: number | null;
    discount_rate: number | null;
    portfolio_media: PortfolioMedia[];
  } | null;
  artists: { title: string | null; profile_image_path: string | null } | null;
}

const STATUS_STYLES: Record<string, { color: string; label: string }> = {
  pending: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "심사 중" },
  approved: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", label: "승인" },
  rejected: { color: "bg-red-500/20 text-red-400 border-red-500/30", label: "반려" },
};

const ACTION_BTN = "rounded-lg px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30";

async function apiCall(method: string, body: unknown): Promise<void> {
  await fetch("/api/admin/exhibition-entries", {
    method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

function formatPrice(n: number): string {
  return `${n.toLocaleString("ko-KR")  }원`;
}

function getStatusStyle(status: string): { color: string; label: string } {
  // eslint-disable-next-line security/detect-object-injection -- Safe: known constant keys
  return STATUS_STYLES[status] ?? STATUS_STYLES.pending;
}

function getSortedMedia(p: EntryItem["portfolios"]): PortfolioMedia[] {
  return [...(p?.portfolio_media ?? [])].sort((x, y) => x.order_index - y.order_index);
}

function getThumbUrl(media: PortfolioMedia[]): string | null {
  const first = media[0] as PortfolioMedia | undefined;
  return first ? getStorageUrl(first.storage_path) : null;
}

function extractPortfolioText(p: EntryItem["portfolios"]): { title: string; description: string } {
  return { title: p?.title ?? "제목 없음", description: p?.description ?? "설명 없음" };
}

function extractPortfolioPrices(p: EntryItem["portfolios"]): { priceOrigin: number | null; price: number | null; discountRate: number | null } {
  return { priceOrigin: p?.price_origin ?? null, price: p?.price ?? null, discountRate: p?.discount_rate ?? null };
}

function extractArtistDisplay(a: EntryItem["artists"]): { avatarUrl: string | null; artistName: string } {
  return {
    avatarUrl: a?.profile_image_path ? getAvatarUrl(a.profile_image_path) : null,
    artistName: a?.title ?? "알 수 없음",
  };
}

interface EntryDisplay {
  title: string; description: string; media: PortfolioMedia[];
  thumbUrl: string | null; mediaCount: number;
  priceOrigin: number | null; price: number | null; discountRate: number | null;
  avatarUrl: string | null; artistName: string;
}

function extractEntryDisplay(entry: EntryItem): EntryDisplay {
  const media = getSortedMedia(entry.portfolios);
  const text = extractPortfolioText(entry.portfolios);
  const prices = extractPortfolioPrices(entry.portfolios);
  const artist = extractArtistDisplay(entry.artists);
  return { ...text, ...prices, ...artist, media, thumbUrl: getThumbUrl(media), mediaCount: media.length };
}

// ─── Image Grid ─────────────────────────────────────────

function ImageGrid({ media }: Readonly<{ media: PortfolioMedia[] }>): React.ReactElement {
  if (media.length === 0) return <p className="text-sm text-zinc-500">이미지 없음</p>;
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
      {media.map((m, i) => {
        const url = getStorageUrl(m.storage_path);
        if (!url) return null;
        return (
          <div key={m.storage_path} className="relative aspect-square overflow-hidden rounded-lg border border-white/10">
            <Image src={url} alt={`이미지 ${i + 1}`} fill sizes="(max-width:767px) 50vw, 200px" className="object-cover" />
          </div>
        );
      })}
    </div>
  );
}

// ─── Price Info ─────────────────────────────────────────

function PriceInfo({ priceOrigin, price, discountRate }: Readonly<{
  priceOrigin: number | null; price: number | null; discountRate: number | null;
}>): React.ReactElement | null {
  if (!price && !priceOrigin) return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {priceOrigin ? <span className="text-sm text-zinc-500 line-through">{formatPrice(priceOrigin)}</span> : null}
      {price ? <span className="text-sm font-bold text-white">{formatPrice(price)}</span> : null}
      {discountRate ? <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-xs font-bold text-red-400">{discountRate}%</span> : null}
    </div>
  );
}

// ─── Portfolio Text Info ─────────────────────────────────

function PortfolioTextInfo({ title, description }: Readonly<{
  title: string | null; description: string | null;
}>): React.ReactElement {
  return (
    <div className="space-y-2">
      <h3 className="text-base font-bold text-white">{title ?? "제목 없음"}</h3>
      <p className={`text-sm ${description ? "whitespace-pre-wrap leading-relaxed text-zinc-400" : "text-zinc-600"}`}>
        {description ?? "설명 없음"}
      </p>
    </div>
  );
}

// ─── Portfolio Detail Panel ──────────────────────────────

function PortfolioDetail({ entry }: Readonly<{ entry: EntryItem }>): React.ReactElement {
  const d = extractEntryDisplay(entry);
  return (
    <div className="space-y-4 rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <ImageGrid media={d.media} />
      <PortfolioTextInfo title={d.title} description={d.description} />
      <PriceInfo priceOrigin={d.priceOrigin} price={d.price} discountRate={d.discountRate} />
    </div>
  );
}

// ─── Entry Thumbnail ────────────────────────────────────

function EntryThumb({ thumbUrl, alt, mediaCount }: Readonly<{
  thumbUrl: string | null; alt: string; mediaCount: number;
}>): React.ReactElement {
  return (
    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 md:h-20 md:w-20">
      {thumbUrl
        ? <Image src={thumbUrl} alt={alt} fill sizes="80px" className="object-cover" />
        : <div className="flex h-full items-center justify-center bg-white/5 text-[10px] text-zinc-600">No Image</div>}
      {mediaCount > 1 ? <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[9px] text-white">{mediaCount}장</span> : null}
    </div>
  );
}

// ─── Artist Row ─────────────────────────────────────────

function ArtistRow({ avatarUrl, name }: Readonly<{
  avatarUrl: string | null; name: string;
}>): React.ReactElement {
  return (
    <div className="mt-1 flex items-center gap-2">
      {avatarUrl ? <Image src={avatarUrl} alt="" width={18} height={18} className="rounded-full" /> : <div className="h-[18px] w-[18px] rounded-full bg-white/10" />}
      <span className="truncate text-xs text-zinc-400">{name}</span>
    </div>
  );
}

// ─── Entry Header (clickable row) ───────────────────────

// ─── Entry Summary Info ─────────────────────────────────

function EntrySummaryInfo({ title, artistName, avatarUrl, status, createdAt, adminNote }: Readonly<{
  title: string; artistName: string; avatarUrl: string | null;
  status: string; createdAt: string; adminNote: string | null;
}>): React.ReactElement {
  const style = getStatusStyle(status);
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-bold text-white">{title}</p>
      <ArtistRow avatarUrl={avatarUrl} name={artistName} />
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${style.color}`}>{style.label}</span>
        <span className="text-[10px] text-zinc-600">{new Date(createdAt).toLocaleString("ko-KR")}</span>
      </div>
      {adminNote ? <p className="mt-1 truncate text-xs text-red-400/80">거절 사유: {adminNote}</p> : null}
    </div>
  );
}

// ─── Entry Header (clickable row) ───────────────────────

function EntryHeader({ entry, expanded, onToggle }: Readonly<{
  entry: EntryItem; expanded: boolean; onToggle: () => void;
}>): React.ReactElement {
  const d = extractEntryDisplay(entry);
  const ExpandIcon = expanded ? ChevronUp : ChevronDown;
  return (
    <button type="button" onClick={onToggle}
      className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <EntryThumb thumbUrl={d.thumbUrl} alt={d.title} mediaCount={d.mediaCount} />
      <EntrySummaryInfo title={d.title} artistName={d.artistName} avatarUrl={d.avatarUrl}
        status={entry.status} createdAt={entry.created_at} adminNote={entry.admin_note} />
      <div className="shrink-0 text-zinc-500">
        <ExpandIcon className="h-5 w-5" />
      </div>
    </button>
  );
}

// ─── Reject Form ────────────────────────────────────────

function RejectForm({ acting, onReject, onCancel }: Readonly<{
  acting: boolean; onReject: (reason: string) => void; onCancel: () => void;
}>): React.ReactElement {
  const [reason, setReason] = useState("");
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-zinc-400">거절 사유 (아티스트에게 표시됨)</label>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)}
        placeholder="예: 이미지 해상도가 낮습니다. 고화질 이미지로 다시 출품해주세요." rows={3}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-red-500 focus:outline-none" />
      <div className="flex gap-2">
        <button type="button" disabled={acting || !reason.trim()} onClick={() => onReject(reason.trim())}
          className={`${ACTION_BTN} flex items-center gap-1.5 bg-red-500 text-white hover:bg-red-600 focus-visible:bg-red-600 disabled:opacity-40`}>
          {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          거절 확정
        </button>
        <button type="button" onClick={onCancel} className={`${ACTION_BTN} bg-white/10 text-zinc-400 hover:bg-white/20 focus-visible:bg-white/20`}>
          취소
        </button>
      </div>
    </div>
  );
}

// ─── Entry Actions ──────────────────────────────────────

function EntryActions({ entry, onAction }: Readonly<{
  entry: EntryItem; onAction: () => void;
}>): React.ReactElement {
  const [rejectMode, setRejectMode] = useState(false);
  const [acting, setActing] = useState(false);

  async function handleApprove(): Promise<void> {
    setActing(true);
    try { await apiCall("PATCH", { id: entry.id, status: "approved" }); onAction(); }
    finally { setActing(false); }
  }

  async function handleReject(reason: string): Promise<void> {
    setActing(true);
    try { await apiCall("PATCH", { id: entry.id, status: "rejected", admin_note: reason }); onAction(); }
    finally { setActing(false); setRejectMode(false); }
  }

  async function handleDelete(): Promise<void> {
    if (!globalThis.confirm("출품을 삭제하시겠습니까?")) return;
    setActing(true);
    try { await apiCall("DELETE", { id: entry.id }); onAction(); }
    finally { setActing(false); }
  }

  return (
    <div className="mt-4 space-y-3">
      {entry.status === "pending" ? (
        <>
          <div className="flex gap-2">
            <button type="button" disabled={acting} onClick={handleApprove}
              className={`${ACTION_BTN} flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 focus-visible:bg-emerald-500/30`}>
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} 승인
            </button>
            <button type="button" disabled={acting} onClick={() => setRejectMode((v) => !v)}
              className={`${ACTION_BTN} flex items-center gap-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 focus-visible:bg-red-500/30`}>
              <X className="h-4 w-4" /> 거절
            </button>
            <button type="button" disabled={acting} onClick={handleDelete}
              className={`${ACTION_BTN} ml-auto flex items-center gap-1.5 bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-red-400 focus-visible:bg-white/10 focus-visible:text-red-400`}>
              <Trash2 className="h-4 w-4" /> 삭제
            </button>
          </div>
          {rejectMode ? <RejectForm acting={acting} onReject={handleReject} onCancel={() => setRejectMode(false)} /> : null}
        </>
      ) : (
        <div className="flex gap-2">
          <button type="button" disabled={acting} onClick={handleDelete}
            className={`${ACTION_BTN} flex items-center gap-1.5 bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-red-400 focus-visible:bg-white/10 focus-visible:text-red-400`}>
            <Trash2 className="h-4 w-4" /> 삭제
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Entry Card ─────────────────────────────────────────

function EntryCard({ entry, onAction }: Readonly<{
  entry: EntryItem; onAction: () => void;
}>): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      <EntryHeader entry={entry} expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
      {expanded ? (
        <div className="border-t border-white/5 p-4">
          <PortfolioDetail entry={entry} />
          <EntryActions entry={entry} onAction={onAction} />
        </div>
      ) : null}
    </div>
  );
}

// ─── Stats Bar ───────────────────────────────────────────

function StatsBar({ entries }: Readonly<{ entries: EntryItem[] }>): React.ReactElement {
  const pending = entries.filter((e) => e.status === "pending").length;
  const approved = entries.filter((e) => e.status === "approved").length;
  const rejected = entries.filter((e) => e.status === "rejected").length;
  return (
    <div className="flex flex-wrap gap-3">
      <StatBox label="전체" value={entries.length} color="bg-white/5 text-white" />
      <StatBox label="심사 중" value={pending} color="bg-amber-500/10 text-amber-400" />
      <StatBox label="승인" value={approved} color="bg-emerald-500/10 text-emerald-400" />
      <StatBox label="반려" value={rejected} color="bg-red-500/10 text-red-400" />
    </div>
  );
}

function StatBox({ label, value, color }: Readonly<{
  label: string; value: number; color: string;
}>): React.ReactElement {
  return (
    <div className={`rounded-lg px-4 py-2 text-center ${color}`}>
      <p className="text-xs">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────

export default function ExhibitionEntriesAdminPage(): React.ReactElement {
  const { isLoading: authLoading } = useAuth();
  const params = useParams();
  const exhibitionId = params?.id as string;
  const [entries, setEntries] = useState<EntryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/exhibition-entries?exhibition_id=${exhibitionId}`);
      if (!res.ok) return;
      const data = await res.json() as { entries: EntryItem[] };
      setEntries(data.entries ?? []);
    } finally { setLoading(false); }
  }, [exhibitionId]);

  useEffect(() => {
    if (!authLoading && exhibitionId) loadEntries();
  }, [authLoading, exhibitionId, loadEntries]);

  if (authLoading || loading) return <AdminLoadingSpinner accentColor="orange" />;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Link href="../" className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="뒤로">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-white">출품 심사</h1>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-zinc-400">{entries.length}건</span>
      </div>
      <StatsBar entries={entries} />
      <section className="space-y-3">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 py-16 text-zinc-500">
            <p className="text-sm">출품된 작품이 없습니다</p>
          </div>
        ) : null}
        {entries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} onAction={loadEntries} />
        ))}
      </section>
    </div>
  );
}
