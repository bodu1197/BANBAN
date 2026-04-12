import { NextResponse } from "next/server";
import { fetchActiveAnnouncements } from "@/lib/supabase/announcement-queries";

/** GET /api/announcements — public active announcements */
export async function GET(): Promise<NextResponse> {
  const announcements = await fetchActiveAnnouncements(5);
  return NextResponse.json({ announcements });
}
