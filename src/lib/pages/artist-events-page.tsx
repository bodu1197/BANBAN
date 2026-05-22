import { EventListClient } from "@/app/(main)/mypage/artist/events/components/EventListClient";

export function renderArtistEventsPage(): React.ReactElement {
  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-background px-4 py-6">
      <EventListClient />
    </main>
  );
}
