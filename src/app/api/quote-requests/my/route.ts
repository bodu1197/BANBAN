import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchMyQuoteRequests } from "@/lib/supabase/quote-queries";

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const requests = await fetchMyQuoteRequests(user.id);
  return NextResponse.json(requests);
}
