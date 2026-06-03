// @client-reason: Client-side event list with delete/status management
"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { getEventStorageUrl } from "@/lib/supabase/storage-utils";

interface EventRow {
  id: string;
  title: string;
  procedure_name: string;
  price: number;
  price_origin: number;
  discount_rate: number | null;
  status: string;
  created_at: string | null;
  views_count: number | null;
  event_end_at: string | null;
  event_media: Array<{ storage_path: string; media_type: string }>;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: "임시저장", className: "bg-muted text-muted-foreground" },
  published: { label: "게시중", className: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400" },
  ended: { label: "종료", className: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" },
  expired: { label: "이벤트 종료(기간만료)", className: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" },
};

function isExpiredByDate(endAt: string | null): boolean {
  if (!endAt) return false;
  const today = new Date().toISOString().slice(0, 10);
  return endAt < today;
}

/** 이벤트 카드 파생값(썸네일/상태배지/재게시잠금) — map 콜백 복잡도 분리. */
function deriveEventCardData(event: EventRow): {
  heroUrl: string | null;
  statusInfo: { label: string; className: string };
  reopenLocked: boolean;
} {
  const media = event.event_media ?? [];
  const hero = media.find((m) => m.media_type === "hero");
  const heroUrl = hero ? getEventStorageUrl(hero.storage_path) : null;
  const dateExpired = isExpiredByDate(event.event_end_at);
  const effectiveStatus = dateExpired && event.status === "published" ? "expired" : event.status;
  // eslint-disable-next-line security/detect-object-injection -- STATUS_LABELS 상수 키 조회(상태 문자열), ?? 폴백으로 미정의 키도 안전
  const statusInfo = STATUS_LABELS[effectiveStatus] ?? STATUS_LABELS.draft;
  return { heroUrl, statusInfo, reopenLocked: dateExpired };
}

/** 이벤트 썸네일(히어로 이미지 또는 플레이스홀더 SVG). */
function EventThumbnail({
  eventId,
  title,
  heroUrl,
}: Readonly<{ eventId: string; title: string; heroUrl: string | null }>): React.ReactElement {
  return (
    <Link
      href={`/events/${eventId}`}
      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted"
    >
      {heroUrl ? (
        <Image src={heroUrl} alt={title} fill className="object-cover" sizes="80px" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </div>
      )}
    </Link>
  );
}

/** 이벤트 카드 액션 버튼(수정/게시토글/삭제). */
function EventCardActions({
  event,
  reopenLocked,
  onStatusToggle,
  onDelete,
}: Readonly<{
  event: EventRow;
  reopenLocked: boolean;
  onStatusToggle: (id: string, currentStatus: string) => void;
  onDelete: (id: string) => void;
}>): React.ReactElement {
  const toggleDisabled = reopenLocked && event.status !== "published";
  return (
    <div className="flex shrink-0 flex-col gap-1.5">
      <Link
        href={`/mypage/artist/events/${event.id}/edit`}
        className="flex min-h-[44px] items-center justify-center rounded-md border border-input px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-muted"
      >
        수정
      </Link>
      <button
        type="button"
        onClick={() => onStatusToggle(event.id, event.status)}
        disabled={toggleDisabled}
        title={toggleDisabled ? "기간 만료된 이벤트는 재게시할 수 없습니다. 새로 등록해주세요." : undefined}
        className="min-h-[44px] rounded-md border border-input px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={event.status === "published" ? "이벤트 종료" : "이벤트 게시"}
      >
        {event.status === "published" ? "종료" : "게시"}
      </button>
      <button
        type="button"
        onClick={() => onDelete(event.id)}
        className="min-h-[44px] rounded-md border border-destructive/30 px-3 py-2 text-xs text-destructive transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-destructive/10"
        aria-label="이벤트 삭제"
      >
        삭제
      </button>
    </div>
  );
}

/** 이벤트 1건 카드(썸네일 + 정보 + 액션). */
function EventCard({
  event,
  onStatusToggle,
  onDelete,
}: Readonly<{
  event: EventRow;
  onStatusToggle: (id: string, currentStatus: string) => void;
  onDelete: (id: string) => void;
}>): React.ReactElement {
  const { heroUrl, statusInfo, reopenLocked } = deriveEventCardData(event);
  return (
    <div className="flex gap-3 rounded-lg border border-input p-3">
      <EventThumbnail eventId={event.id} title={event.title} heroUrl={heroUrl} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
          {(event.discount_rate ?? 0) > 0 && (
            <span className="text-xs font-bold text-red-700 dark:text-red-400">{event.discount_rate}%</span>
          )}
        </div>
        <Link href={`/events/${event.id}`} className="block rounded focus-visible:ring-2 focus-visible:ring-ring">
          <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
        </Link>
        <p className="text-xs text-muted-foreground">
          {event.price.toLocaleString()}원 · 조회 {event.views_count ?? 0}
        </p>
      </div>
      <EventCardActions
        event={event}
        reopenLocked={reopenLocked}
        onStatusToggle={onStatusToggle}
        onDelete={onDelete}
      />
    </div>
  );
}

/** 이벤트가 없을 때의 빈 상태. */
function EmptyEventsState(): React.ReactElement {
  return (
    <div className="py-16 text-center">
      <p className="text-muted-foreground">아직 등록한 이벤트가 없습니다.</p>
      <Link
        href="/mypage/artist/events/write"
        className="mt-4 inline-block rounded-lg bg-brand-primary px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
      >
        첫 이벤트 등록하기
      </Link>
    </div>
  );
}

export function EventListClient(): React.ReactElement {
  const { artist, isLoading: authLoading } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = useCallback(async (artistId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("events")
      .select("id, title, procedure_name, price, price_origin, discount_rate, status, created_at, views_count, event_end_at, event_media(storage_path, media_type)")
      .eq("artist_id", artistId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    setEvents((data ?? []) as EventRow[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch; setState는 await 이후라 동기 cascade 아님(인증 기반 클라 페치)
    if (artist?.id) fetchEvents(artist.id);
  }, [artist?.id, fetchEvents]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("이벤트를 삭제하시겠습니까?")) return;
    const supabase = createClient();
    await supabase
      .from("events")
      .update({ deleted_at: new Date().toISOString(), status: "deleted" })
      .eq("id", id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleStatusToggle = useCallback(async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "published" ? "ended" : "published";
    const supabase = createClient();
    await supabase.from("events").update({ status: newStatus }).eq("id", id);
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: newStatus } : e)),
    );
  }, []);

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center" role="status" aria-label="이벤트 로딩 중">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        아티스트 계정으로 로그인해주세요.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">내 이벤트</h1>
        <Link
          href="/mypage/artist/events/write"
          className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          이벤트 등록
        </Link>
      </div>

      {events.length === 0 ? (
        <EmptyEventsState />
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onStatusToggle={handleStatusToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
