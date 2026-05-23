import { NextResponse } from "next/server";
import { fetchActiveAnnouncements } from "@/lib/supabase/announcement-queries";

/** GET /api/announcements — public active announcements. CDN 5min cache (자주 안 바뀜). */
export async function GET(): Promise<NextResponse> {
  const announcements = await fetchActiveAnnouncements(5);
  return NextResponse.json(
    { announcements },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
