import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import type { EventCardData } from "@/lib/supabase/event-queries";
import { extractArtistInfo } from "@/lib/event/artist-utils";

export const RecommendedEventCard = memo(function RecommendedEventCard({
  event,
}: Readonly<{ event: EventCardData }>): React.ReactElement {
  const { name: artistName, region: regionName } = extractArtistInfo(event.artist);

  return (
    <Link
      href={`/events/${event.id}`}
      className="flex gap-3 py-3 transition-colors hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
        {event.hero_image ? (
          <Image
            src={event.hero_image}
            alt={event.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 96px, 120px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
        )}
        {(event.discount_rate ?? 0) > 0 && (
          <span className="absolute left-1 top-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {event.discount_rate}%
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
        <p className="text-xs text-muted-foreground">{event.procedure_name}</p>
        {(artistName || regionName) && (
          <p className="truncate text-xs text-muted-foreground">
            {artistName}{regionName ? ` · ${regionName}` : ""}
          </p>
        )}
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
      </div>
    </Link>
  );
});
