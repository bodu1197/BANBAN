// @client-reason: 매 페이지 로드마다 인기 이벤트 카드 순서를 랜덤화 (ISR 캐시와 무관)
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SquareImage } from "@/components/home/SquareImage";
import { secureShuffle } from "@/lib/random";
import type { EventCardData } from "@/lib/supabase/event-queries";

const DISPLAY_COUNT = 10;

function PopularEventCard({ event, priority = false }: Readonly<{
  event: EventCardData;
  priority?: boolean;
}>): React.ReactElement {
  return (
    <Link
      href={`/events/${event.id}`}
      className="group inline-block w-60 shrink-0 snap-start whitespace-normal mr-[15px] rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <SquareImage src={event.hero_image} alt={event.title} sizes="240px" priority={priority} />
      <div className="mt-2.5">
        <p className="truncate text-base font-semibold transition-colors group-hover:text-brand-primary group-focus-visible:text-brand-primary">
          {event.title}
        </p>
        <p className="truncate text-sm text-muted-foreground">{event.procedure_name}</p>
        <div className="mt-1 flex items-baseline gap-1.5">
          {(event.discount_rate ?? 0) > 0 && (
            <span className="text-xs text-muted-foreground line-through">
              {event.price_origin.toLocaleString()}원
            </span>
          )}
          <span className="text-sm font-bold">{event.price.toLocaleString()}원</span>
          {(event.discount_rate ?? 0) > 0 && (
            <span className="text-xs font-bold text-red-600">{event.discount_rate}%</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function PopularEventsList({ events }: Readonly<{ events: EventCardData[] }>): React.ReactElement {
  const initialDisplay = useMemo(() => events.slice(0, DISPLAY_COUNT), [events]);
  const [displayed, setDisplayed] = useState<EventCardData[]>(initialDisplay);

  useEffect(() => {
    setDisplayed(secureShuffle(events).slice(0, DISPLAY_COUNT));
  }, [events]);

  return (
    <>
      {displayed.map((event, i) => (
        <PopularEventCard key={event.id} event={event} priority={i === 0} />
      ))}
    </>
  );
}
