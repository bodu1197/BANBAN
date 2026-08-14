import { createAdminClient } from "@/lib/supabase/server";
import { getActiveEventFilter } from "@/lib/supabase/event-queries";
import {
  ITEMS_PER_PAGE,
  buildUrlEntry,
  wrapUrlset,
  xmlResponse,
} from "@/lib/sitemap-utils";
import type { NextRequest } from "next/server";

/**
 * 이벤트 사이트맵. 하단탭 2번째 메뉴인데도 사이트맵에 아예 없어서
 * /events·/events/[id] 가 "Google에는 아직 알려지지 않은 URL" 이었다(2026-08-14 실측).
 * 술어(status=published + deleted_at null + 미만료)는 sitemap.xml 인덱스의 개수 집계와 반드시 동일하게 유지할 것 —
 * 어긋나면 없는 page=N 을 제출하거나 뒤쪽 페이지를 통째로 빠뜨린다.
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const pageParam = Number(request.nextUrl.searchParams.get("page") ?? "1");
    const page = Number.isFinite(pageParam) ? Math.max(1, Math.trunc(pageParam)) : 1;
    const offset = (page - 1) * ITEMS_PER_PAGE;

    const supabase = createAdminClient();
    const { data: events } = await supabase
      .from("events")
      .select("id, updated_at, created_at")
      .eq("status", "published")
      .is("deleted_at", null)
      // 만료 이벤트는 상세가 noindex 라(event-detail-page.tsx) 제출하면 GSC "제출된 URL이 noindex" 가 뜬다.
      .or(getActiveEventFilter())
      .order("created_at", { ascending: true })
      // 동률 시 페이지 경계에서 중복·누락이 생기지 않도록 타이브레이커.
      .order("id", { ascending: true })
      .range(offset, offset + ITEMS_PER_PAGE - 1);

    if (!events?.length) {
      return xmlResponse(wrapUrlset(""));
    }

    const urls = events
      .map((e) => {
        // lastmod 는 실제 변경 시각이어야 한다 — 요청 시각을 넣으면 구글이 lastmod 신호를 통째로 무시한다.
        const modified = e.updated_at ?? e.created_at;
        return buildUrlEntry(
          `/events/${e.id}`,
          modified ? new Date(modified).toISOString() : new Date().toISOString(),
          "weekly",
          "0.7",
        );
      })
      .join("");

    return xmlResponse(wrapUrlset(urls));
  } catch {
    return new Response("Error generating events sitemap", { status: 500 });
  }
}
