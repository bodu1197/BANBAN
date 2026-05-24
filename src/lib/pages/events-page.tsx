import { Suspense } from "react";
import { fetchPublishedEvents } from "@/lib/supabase/event-queries";
import { EventCard } from "@/components/event/EventCard";

async function EventGrid(): Promise<React.ReactElement> {
  const events = await fetchPublishedEvents({ limit: 30 });

  if (events.length === 0) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        아직 등록된 이벤트가 없습니다.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

export function renderEventsPage(): React.ReactElement {
  return (
    <main className="mx-auto min-h-screen max-w-[1200px] bg-background px-4 py-6">
      <h1 className="mb-6 text-xl font-bold">이벤트</h1>
      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        }
      >
        <EventGrid />
      </Suspense>
    </main>
  );
}
