import type { Metadata } from "next";
import { Suspense } from "react";
import { fetchEventById, fetchRelatedEvents, incrementEventViews } from "@/lib/supabase/event-queries";
import { EventDetailClient } from "@/components/event/EventDetailClient";
import { EventCard } from "@/components/event/EventCard";
import { buildPageSeo } from "@/lib/seo";
import { getEventStorageUrl } from "@/lib/supabase/storage-utils";
import type { GeneratedEventContent } from "@/components/event-form/types";

export async function generateEventMetadata(id: string): Promise<Metadata> {
  const event = await fetchEventById(id);
  if (!event) return { title: "이벤트를 찾을 수 없습니다 | 반언니" };

  const aiContent = event.ai_generated_content as GeneratedEventContent | null;
  const description = aiContent?.seoDescription ?? event.procedure_summary;
  const heroMedia = event.event_media?.[0];
  const heroImage = heroMedia ? getEventStorageUrl(heroMedia.storage_path) : null;

  return {
    title: `${event.title} | 반언니`,
    description,
    ...buildPageSeo({
      title: event.title,
      description,
      path: `/events/${id}`,
      image: heroImage,
    }),
  };
}

async function RelatedEvents({
  artistId,
  excludeId,
}: Readonly<{ artistId: string; excludeId: string }>): Promise<React.ReactElement> {
  const related = await fetchRelatedEvents(artistId, excludeId);
  if (related.length === 0) return <></>;

  return (
    <section className="space-y-4 px-4 py-6">
      <h2 className="text-base font-bold">다른 이벤트</h2>
      <div className="grid grid-cols-2 gap-3">
        {related.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </section>
  );
}

export async function renderEventDetailPage(id: string): Promise<React.ReactElement | null> {
  const event = await fetchEventById(id);
  if (!event) return null;

  void incrementEventViews(id);

  return (
    <main className="mx-auto min-h-screen max-w-[768px] bg-background">
      <EventDetailClient event={event} />
      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-3 px-4 py-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        }
      >
        <RelatedEvents artistId={event.artist_id} excludeId={event.id} />
      </Suspense>
    </main>
  );
}
