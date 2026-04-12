import { notFound, redirect } from "next/navigation";
import { STRINGS } from "@/lib/strings";
import { fetchQuoteRequestDetail } from "@/lib/supabase/quote-queries";
import { getUser } from "@/lib/supabase/auth";
import { QuoteRequestEditClient } from "@/components/quote-request/QuoteRequestEditClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: Readonly<PageProps>): Promise<React.ReactElement> {
  const { id } = await params;
  const [user, request] = await Promise.all([
    getUser(),
    fetchQuoteRequestDetail(id),
  ]);

  if (!user) redirect("/login");
  if (!request) notFound();
  if (request.userId !== user.id || request.status !== "OPEN") redirect(`/quote-request/${id}`);

  return (
    <main className="mx-auto w-full max-w-[767px] px-4 py-6">
      <QuoteRequestEditClient request={request} labels={STRINGS.quoteRequest} />
    </main>
  );
}
