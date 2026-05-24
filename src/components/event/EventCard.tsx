import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import type { EventCardData } from "@/lib/supabase/event-queries";

// memo — 부모 (이벤트 목록) 리렌더 시 같은 event 객체면 skip
export const EventCard = memo(function EventCard({ event }: Readonly<{ event: EventCardData }>): React.ReactElement {
  const artistName = typeof event.artist === "object" ? event.artist.title : "";
  const regionName =
    typeof event.artist === "object" && event.artist.region
      ? typeof event.artist.region === "object" && "name" in event.artist.region
        ? (event.artist.region as { name: string }).name
        : ""
      : "";

  return (
    <Link
      href={`/events/${event.id}`}
      className="group block overflow-hidden rounded-lg border border-input transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Thumbnail */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {event.hero_image ? (
          <Image
            src={event.hero_image}
            alt={event.title}
            fill
            className="object-cover transition-transform group-hover:scale-105 group-focus-visible:scale-105"
            sizes="(max-width: 768px) 50vw, 300px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
        )}

        {/* Discount badge */}
        {(event.discount_rate ?? 0) > 0 && (
          <span className="absolute left-2 top-2 rounded-md bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
            {event.discount_rate}%
          </span>
        )}
      </div>

      {/* Info */}
      <div className="space-y-1 p-3">
        <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
        <p className="text-xs text-muted-foreground">{event.procedure_name}</p>
        <div className="flex items-baseline gap-1.5">
          {(event.discount_rate ?? 0) > 0 && (
            <span className="text-xs text-muted-foreground line-through">
              {event.price_origin.toLocaleString()}원
            </span>
          )}
          <span className="text-sm font-bold text-foreground">
            {event.price.toLocaleString()}원
          </span>
        </div>
        {(artistName || regionName) && (
          <p className="truncate text-xs text-muted-foreground">
            {artistName}{regionName ? ` · ${regionName}` : ""}
          </p>
        )}
      </div>
    </Link>
  );
});
