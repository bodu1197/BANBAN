import { NextResponse } from "next/server";
import { fetchActiveAnnouncements } from "@/lib/supabase/announcement-queries";

/**
 * GET /api/announcements — public active announcements.
 * 캐싱: fetchActiveAnnouncements 의 unstable_cache("announcements" 태그, 300s)가 DB 부하를 흡수.
 * admin 공지 생성/토글/삭제 시 revalidateTag("announcements") → 변경 즉시 반영.
 * (수동 CDN s-maxage 헤더는 태그 무효화를 무력화하므로 두지 않는다 — Data Cache 로 대체.)
 */
export async function GET(): Promise<NextResponse> {
  const announcements = await fetchActiveAnnouncements(5);
  return NextResponse.json({ announcements });
}
