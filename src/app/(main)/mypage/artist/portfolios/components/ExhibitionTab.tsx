// @client-reason: Fetches active exhibitions and artist entries, handles submission interaction
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, Check, XCircle, ChevronRight, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getStorageUrl } from "@/lib/supabase/storage-utils";
// ─── Types ───────────────────────────────────────────────

interface Exhibition {
  id: string;
  title: string;
  subtitle: string | null;
  image_path: string;
  category: string;
  end_at: string | null;
}

interface MyEntry {
  id: string;
  exhibition_id: string;
  status: string;
  admin_note: string | null;
}

// ─── Helpers ────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { icon: typeof Check; color: string; label: string }> = {
  pending: { icon: Clock, color: "bg-amber-500/20 text-amber-500", label: "심사 중" },
  approved: { icon: Check, color: "bg-emerald-500/20 text-emerald-500", label: "승인됨" },
  rejected: { icon: XCircle, color: "bg-red-500/20 text-red-500", label: "반려됨" },
};

function getStatusInfo(status: string): { icon: typeof Check; color: string; label: string } {
  // eslint-disable-next-line security/detect-object-injection -- Safe: known constant keys
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
}

// ─── Exhibition Card ────────────────────────────────────

function ExhibitionEntryStatus({ entries }: Readonly<{ entries: MyEntry[] }>): React.ReactElement | null {
  if (entries.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      {entries.map((entry) => {
        const info = getStatusInfo(entry.status);
        const Icon = info.icon;
        return (
          <div key={entry.id}>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${info.color}`}>
              <Icon className="h-3 w-3" aria-hidden="true" />
              {info.label}
            </span>
            {entry.status === "rejected" && entry.admin_note ? (
              <p className="mt-0.5 text-[11px] text-red-500/80">{entry.admin_note}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ExhibitionCard({ exhibition, myEntries }: Readonly<{
  exhibition: Exhibition; myEntries: MyEntry[]; }>): React.ReactElement {
  const imageUrl = getStorageUrl(exhibition.image_path);
  const entriesForThis = myEntries.filter((e) => e.exhibition_id === exhibition.id);
  const [now] = useState(() => Date.now());
  const daysLeft = exhibition.end_at ? Math.ceil((new Date(exhibition.end_at).getTime() - now) / 86400000) : null;

  return (
    <Link href={`/exhibition/${exhibition.id}`}
      className="group flex gap-4 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg">
        {imageUrl ? (
          <Image src={imageUrl} alt={exhibition.title} fill sizes="112px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted text-xs text-muted-foreground">No Image</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-bold text-foreground">{exhibition.title}</h3>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5" />
        </div>
        {exhibition.subtitle ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{exhibition.subtitle}</p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {daysLeft !== null && daysLeft > 0 ? (
            <span className="rounded bg-brand-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-primary">
              D-{daysLeft}
            </span>
          ) : null}
          {daysLeft !== null && daysLeft <= 0 ? (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              종료됨
            </span>
          ) : null}
          {entriesForThis.length === 0 ? (
            <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-500">
              출품 가능
            </span>
          ) : null}
        </div>
        <ExhibitionEntryStatus entries={entriesForThis} />
      </div>
    </Link>
  );
}

// ─── Empty State ────────────────────────────────────────

function EmptyState(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <Sparkles className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">현재 진행 중인 기획전이 없습니다</p>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────

interface ExhibitionTabProps {
  artistId: string;
}

export default function ExhibitionTab({ artistId}: Readonly<ExhibitionTabProps>): React.ReactElement {
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [myEntries, setMyEntries] = useState<MyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const didLoad = useRef(false);

  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;

    const supabase = createClient();
    const nowISO = new Date().toISOString();

    Promise.all([
      supabase
        .from("exhibitions")
        .select("id, title, subtitle, image_path, category, end_at")
        .eq("is_active", true)
        .or(`start_at.is.null,start_at.lte.${nowISO}`)
        .order("order_index", { ascending: true }),
      supabase
        .from("exhibition_entries")
        .select("id, exhibition_id, status, admin_note")
        .eq("artist_id", artistId),
    ]).then(([exRes, entryRes]) => {
      setExhibitions((exRes.data ?? []) as Exhibition[]);
      setMyEntries((entryRes.data ?? []) as MyEntry[]);
      setLoading(false);
    });
  }, [artistId]);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" /></div>;
  }

  if (exhibitions.length === 0) return <EmptyState />;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">기획전을 클릭하면 상세 페이지에서 작품을 출품할 수 있습니다</p>
      {exhibitions.map((ex) => (
        <ExhibitionCard key={ex.id} exhibition={ex} myEntries={myEntries} />
      ))}
    </div>
  );
}
