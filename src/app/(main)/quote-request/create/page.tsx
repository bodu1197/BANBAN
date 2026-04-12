import { redirect } from "next/navigation";
import { STRINGS } from "@/lib/strings";
import { getUser } from "@/lib/supabase/auth";
import { QuoteRequestCreateClient } from "@/components/quote-request/QuoteRequestCreateClient";

export default async function Page(): Promise<React.ReactElement> {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-[767px] px-4 py-6">
      <QuoteRequestCreateClient labels={STRINGS.quoteRequest} />
    </main>
  );
}
