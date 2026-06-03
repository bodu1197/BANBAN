import { fetchPublishedEvents } from "@/lib/supabase/event-queries";
import { fetchActiveRegions } from "@/lib/supabase/portfolio-search-queries";
import { EventsSearchClient } from "@/components/event/EventsSearchClient";

export async function renderEventsPage(): Promise<React.ReactElement> {
  const [result, regions] = await Promise.all([
    fetchPublishedEvents({ limit: 30 }),
    fetchActiveRegions("SEMI_PERMANENT"),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <EventsSearchClient
        initialEvents={result.events}
        initialTotalCount={result.totalCount}
        regions={regions}
      />
    </div>
  );
}
