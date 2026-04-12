import { NextResponse } from "next/server";
import { fetchQuoteRequests } from "@/lib/supabase/quote-queries";

export async function GET(): Promise<NextResponse> {
  const requests = await fetchQuoteRequests(5);
  return NextResponse.json(requests);
}
