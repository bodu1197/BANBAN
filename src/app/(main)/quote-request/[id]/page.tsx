import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { STRINGS } from "@/lib/strings";
import { fetchQuoteRequestDetail } from "@/lib/supabase/quote-queries";
import { createClient } from "@/lib/supabase/server";
import { QuoteRequestDetailClient } from "@/components/quote-request/QuoteRequestDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: STRINGS.quoteRequest.title ?? "견적 요청",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: Readonly<PageProps>): Promise<React.ReactElement> {
  const { id } = await params;
  const [request, supabase] = await Promise.all([
    fetchQuoteRequestDetail(id),
    createClient(),
  ]);

  if (!request) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = user?.id === request.userId;

  let isArtist = false;
  let artistId: string | null = null;
  if (user) {
    const { data: artist } = await supabase
      .from("artists")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (artist) {
      isArtist = true;
      artistId = artist.id;
    }
  }

  return (
    <main className="mx-auto w-full max-w-[767px] px-4 py-6">
      <QuoteRequestDetailClient
        request={request}
        labels={STRINGS.quoteRequest}
        isOwner={isOwner}
        isArtist={isArtist}
        artistId={artistId}
        currentUserId={user?.id ?? null}
      />
    </main>
  );
}
