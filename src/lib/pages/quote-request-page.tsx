import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { STRINGS } from "@/lib/strings";
import { getAlternates } from "@/lib/seo";
import { getUser } from "@/lib/supabase/auth";
import { fetchQuoteRequests } from "@/lib/supabase/quote-queries";
import { QuoteRequestListClient } from "@/components/quote-request/QuoteRequestListClient";
import { createClient } from "@/lib/supabase/server";

export async function generateQuoteRequestMetadata(): Promise<Metadata> {
  return {
    title: STRINGS.pages.quoteRequest,
    description: STRINGS.pages.quoteRequestDesc,
    alternates: getAlternates("/quote-request"),
  };
}

async function isArtistOrAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();
  if ((data as { is_admin: boolean } | null)?.is_admin) return true;
  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", userId)
    .limit(1);
  return (artist ?? []).length > 0;
}

export async function renderQuoteRequestPage(): Promise<React.ReactElement> {
  const user = await getUser();
  if (!user) redirect("/login");
  const hasAccess = await isArtistOrAdmin(user.id);
  if (!hasAccess) redirect("/quote-request/create");

  const requests = await fetchQuoteRequests(30);

  return (
    <main className="mx-auto w-full max-w-[767px] px-4 py-6">
      <QuoteRequestListClient
        requests={requests}
        labels={STRINGS.quoteRequest}
      />
    </main>
  );
}
