// @client-reason: localStorage 기반 최근 본 이벤트 표시 (비로그인자 포함)
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { STRINGS } from "@/lib/strings";
import { SquareImage } from "@/components/home/SquareImage";
import { SectionHeader } from "@/components/home/SectionHeader";
import { HorizontalScrollList } from "@/components/home/HorizontalScrollList";
import { getRecentEvents, type RecentEventEntry } from "@/lib/recent-events";

function RecentEventCard({ event }: Readonly<{ event: RecentEventEntry }>): React.ReactElement {
  return (
    <Link
      href={`/events/${event.id}`}
      className="group inline-block w-60 shrink-0 snap-start whitespace-normal mr-[15px] rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <SquareImage src={event.heroImage} alt={event.title} sizes="240px" />
      <div className="mt-2.5">
        <p className="truncate text-base font-semibold motion-safe:transition-colors group-hover:text-brand-primary group-focus-visible:text-brand-primary">
          {event.title}
        </p>
        <p className="truncate text-sm text-muted-foreground">{event.procedureName}</p>
        <div className="mt-1 flex items-baseline gap-1.5">
          {(event.discountRate ?? 0) > 0 && (
            <span className="text-xs text-muted-foreground line-through">
              {event.priceOrigin.toLocaleString()}원
            </span>
          )}
          <span className="text-sm font-bold">{event.price.toLocaleString()}원</span>
          {(event.discountRate ?? 0) > 0 && (
            <span className="text-xs font-bold text-red-600">{event.discountRate}%</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function RecentEventsSection(): React.ReactElement | null {
  const [events, setEvents] = useState<RecentEventEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setEvents(getRecentEvents());
    setMounted(true);
  }, []);

  if (!mounted || events.length === 0) return null;

  return (
    <section className="py-4">
      <SectionHeader
        title={STRINGS.homepage.recentEventsSection ?? "최근 본 이벤트"}
        moreLink="/events"
        moreText={STRINGS.homepage.seeMore}
      />
      <HorizontalScrollList>
        {events.map((event) => (
          <RecentEventCard key={event.id} event={event} />
        ))}
      </HorizontalScrollList>
    </section>
  );
}
