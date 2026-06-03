import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchEventById } from "@/lib/supabase/event-queries";
import { EventEditClient } from "./components/EventEditClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EventEditPage({ params }: Readonly<PageProps>): Promise<React.ReactElement> {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: artist } = await supabase
    .from("artists")
    .select("id, title")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!artist) redirect("/mypage");

  const event = await fetchEventById(id);

  if (!event || event.artist_id !== artist.id) {
    redirect("/mypage/artist/events");
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-background px-4 py-6">
      <EventEditClient event={event} artistTitle={artist.title} />
    </div>
  );
}
