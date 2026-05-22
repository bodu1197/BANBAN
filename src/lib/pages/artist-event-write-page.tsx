import { EventWriteClient } from "@/app/(main)/mypage/artist/events/write/components/EventWriteClient";

export function renderArtistEventWritePage(): React.ReactElement {
  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-background px-4 py-6">
      <EventWriteClient />
    </main>
  );
}
