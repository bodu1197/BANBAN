// @client-reason: Interactive portfolio submission modal, toast notifications, and client-side portfolio fetching
"use client";

import { STRINGS } from "@/lib/strings";
import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Check, Clock, XCircle, Loader2 } from "lucide-react";
import { getStorageUrl, getAvatarUrl } from "@/lib/supabase/storage-utils";
import { submitExhibitionEntry, withdrawExhibitionEntry } from "@/lib/actions/exhibition-entries";
import type { ExhibitionEntryWithDetails, ArtistEntry } from "@/lib/supabase/exhibition-entry-queries";
// ─── Types ───────────────────────────────────────────────

interface PortfolioOption {
  id: string;
  title: string;
  thumbnail_path: string | null;
}

interface ExhibitionDetailClientProps {
  exhibitionId: string;
  entries: ExhibitionEntryWithDetails[];
  artistId: string | null;
  artistEntries: ArtistEntry[];
  isActive: boolean;
}

// ─── Status Badge ────────────────────────────────────────

interface StatusInfo { icon: typeof Check; className: string; label: string }

function getStatusConfig(): Record<string, StatusInfo> {
  return {
    approved: { icon: Check, className: "bg-emerald-500/20 text-emerald-500", label: STRINGS.exhibition.approved },
    pending: { icon: Clock, className: "bg-amber-500/20 text-amber-500", label: STRINGS.exhibition.pending },
    rejected: { icon: XCircle, className: "bg-red-500/20 text-red-500", label: STRINGS.exhibition.rejected },
  };
}

function StatusBadge({ status }: Readonly<{ status: string }>): React.ReactElement {
  const config = getStatusConfig();
  const { icon: Icon, className, label } = config[status as keyof typeof config] ?? config.pending;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${className}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}

// ─── Portfolio Entry Card ────────────────────────────────

function EntryCard({ entry}: Readonly<{ entry: ExhibitionEntryWithDetails; }>): React.ReactElement {
  const thumbnailUrl = getStorageUrl(entry.portfolio.thumbnail_path);
  const artistImageUrl = getAvatarUrl(entry.artist.profile_image_path);
  return (
    <Link href={`/portfolios/${entry.portfolio_id}`}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <EntryCardImage thumbnailUrl={thumbnailUrl} title={entry.portfolio.title} discountRate={entry.portfolio.discount_rate} />
      <div className="p-3">
        <p className="truncate text-sm font-medium text-foreground">{entry.portfolio.title}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full bg-muted">
            {artistImageUrl ? <Image src={artistImageUrl} alt={entry.artist.title} fill sizes="20px" className="object-cover" /> : null}
          </div>
          <span className="truncate text-xs text-muted-foreground">{entry.artist.title}</span>
        </div>
        <p className="mt-1 text-sm font-semibold text-foreground">
          {entry.portfolio.price.toLocaleString()}
          <span className="text-xs font-normal text-muted-foreground"> {"ko" === "ko" ? "원" : ""}</span>
        </p>
      </div>
    </Link>
  );
}

function EntryCardImage({ thumbnailUrl, title, discountRate }: Readonly<{
  thumbnailUrl: string | null; title: string; discountRate: number;
}>): React.ReactElement {
  return (
    <div className="relative aspect-square overflow-hidden">
      {thumbnailUrl ? (
        <Image src={thumbnailUrl} alt={title} fill sizes="(max-width: 767px) 50vw, 250px"
          className="object-cover transition-transform group-hover:scale-105 group-focus-visible:scale-105" loading="lazy" />
      ) : (
        <div className="flex h-full items-center justify-center bg-muted text-xs text-muted-foreground">No Image</div>
      )}
      {discountRate > 0 ? (
        <span className="absolute left-2 top-2 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{discountRate}%</span>
      ) : null}
    </div>
  );
}

// ─── Portfolio List Item ─────────────────────────────────

function PortfolioListItem({ portfolio, isSubmitted, isPending, onSubmit }: Readonly<{
  portfolio: PortfolioOption; isSubmitted: boolean; isPending: boolean; onSubmit: (id: string) => void;
}>): React.ReactElement {
  const thumbUrl = getStorageUrl(portfolio.thumbnail_path);
  return (
    <button key={portfolio.id} type="button" disabled={isSubmitted || isPending} onClick={() => onSubmit(portfolio.id)}
      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isSubmitted ? "cursor-not-allowed border-border bg-muted/50 opacity-60" : "border-border hover:border-brand-primary hover:bg-brand-primary/5"
      }`}>
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
        {thumbUrl ? <Image src={thumbUrl} alt={portfolio.title} fill sizes="56px" className="object-cover" /> : null}
      </div>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{portfolio.title}</span>
      {isSubmitted ? (
        <span className="shrink-0 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-medium text-emerald-500">
          {STRINGS.exhibition.submitted}
        </span>
      ) : null}
    </button>
  );
}

// ─── Submit Modal ────────────────────────────────────────

function SubmitModal({ exhibitionId, artistId, artistEntries, onClose, onSubmitted }: Readonly<{
  exhibitionId: string; artistId: string; artistEntries: ArtistEntry[];
  onClose: () => void; onSubmitted: () => void;
}>): React.ReactElement {
  const [portfolios, setPortfolios] = useState<PortfolioOption[]>([]);
  const [loadingPortfolios, setLoadingPortfolios] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const submittedIds = new Set(artistEntries.map((e) => e.portfolio_id));

  useState(() => {
    fetch(`/api/artist-portfolios?artistId=${artistId}`)
      .then((r) => (r.ok ? r.json() : { portfolios: [] }))
      .then((d: { portfolios: PortfolioOption[] }) => setPortfolios(d.portfolios ?? []))
      .catch(() => { /* ignore */ })
      .finally(() => setLoadingPortfolios(false));
  });

  function handleSubmit(portfolioId: string): void {
    startTransition(async () => {
      const r = await submitExhibitionEntry(exhibitionId, portfolioId);
      if (r.success) { setToast(STRINGS.exhibition.submitSuccess); onSubmitted(); setTimeout(onClose, 1500); }
      else if (r.error === "already_submitted") setToast(STRINGS.exhibition.alreadySubmitted);
      else if (r.error === "exhibition_ended") setToast(STRINGS.exhibition.exhibitionEnded);
      else setToast(r.error ?? STRINGS.common.error);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-t-2xl bg-background p-5 md:rounded-2xl md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">{STRINGS.exhibition.selectPortfolio}</h2>
          <button type="button" onClick={onClose} aria-label={STRINGS.common.close}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="h-5 w-5" />
          </button>
        </div>
        {toast ? <div className="mb-4 rounded-lg bg-brand-primary/10 px-4 py-2.5 text-sm text-brand-primary">{toast}</div> : null}
        <SubmitModalContent portfolios={portfolios} loading={loadingPortfolios} isPending={isPending}
          submittedIds={submittedIds} onSubmit={handleSubmit} />
      </div>
    </div>
  );
}

function SubmitModalContent({ portfolios, loading, isPending, submittedIds, onSubmit }: Readonly<{
  portfolios: PortfolioOption[]; loading: boolean; isPending: boolean;
  submittedIds: Set<string>; onSubmit: (id: string) => void;
}>): React.ReactElement {
  if (loading) return <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (portfolios.length === 0) return <p className="py-10 text-center text-sm text-muted-foreground">{STRINGS.artist.noPortfolio}</p>;
  return (
    <div className="max-h-[60vh] space-y-2 overflow-y-auto">
      {portfolios.map((p) => (
        <PortfolioListItem key={p.id} portfolio={p} isSubmitted={submittedIds.has(p.id)}
          isPending={isPending} onSubmit={onSubmit} />
      ))}
    </div>
  );
}

// ─── My Entries Section ──────────────────────────────────

function MyEntriesSection({ artistEntries }: Readonly<{
  artistEntries: ArtistEntry[]; }>): React.ReactElement | null {
  const [isPending, startTransition] = useTransition();
  const [localEntries, setLocalEntries] = useState(artistEntries);
  if (localEntries.length === 0) return null;

  function handleWithdraw(entryId: string): void {
    startTransition(async () => {
      const result = await withdrawExhibitionEntry(entryId);
      if (result.success) setLocalEntries((prev) => prev.filter((e) => e.id !== entryId));
    });
  }

  return (
    <section className="border-b border-border px-4 py-4 md:px-6">
      <h3 className="mb-3 text-sm font-bold text-foreground">{STRINGS.exhibition.myEntries}</h3>
      <div className="space-y-2">
        {localEntries.map((entry) => (
          <div key={entry.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusBadge status={entry.status} />
                <span className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</span>
              </div>
              {entry.status === "pending" ? (
                <button type="button" disabled={isPending} onClick={() => handleWithdraw(entry.id)}
                  className="rounded px-2.5 py-1 text-xs text-red-500 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {STRINGS.exhibition.withdraw}
                </button>
              ) : null}
            </div>
            {entry.status === "rejected" && entry.admin_note ? (
              <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs leading-relaxed text-red-500">
                {STRINGS.exhibition.rejectReason}: {entry.admin_note}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Entries Grid ────────────────────────────────────────

function EntriesGrid({ entries }: Readonly<{
  entries: ExhibitionEntryWithDetails[]; }>): React.ReactElement {
  if (entries.length === 0) {
    return (
      <section className="px-4 py-6 md:px-6">
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">{STRINGS.exhibition.noEntries}</p>
        </div>
      </section>
    );
  }
  return (
    <section className="px-4 py-6 md:px-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {entries.map((entry) => <EntryCard key={entry.id} entry={entry} />)}
      </div>
    </section>
  );
}

// ─── Main Component ──────────────────────────────────────

export function ExhibitionDetailClient({
  exhibitionId, entries, artistId, artistEntries, isActive,
}: Readonly<ExhibitionDetailClientProps>): React.ReactElement {
  const [showModal, setShowModal] = useState(false);
  const [key, setKey] = useState(0);
  return (
    <>
      {artistId && isActive ? (
        <section className="border-b border-border px-4 py-4 md:px-6">
          <button type="button" onClick={() => setShowModal(true)}
            className="w-full rounded-xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {STRINGS.exhibition.submitPortfolio}
          </button>
        </section>
      ) : null}
      {artistId ? <MyEntriesSection key={key} artistEntries={artistEntries} /> : null}
      <EntriesGrid entries={entries} />
      {showModal && artistId ? (
        <SubmitModal exhibitionId={exhibitionId} artistId={artistId} artistEntries={artistEntries} onClose={() => setShowModal(false)} onSubmitted={() => setKey((k) => k + 1)} />
      ) : null}
    </>
  );
}
