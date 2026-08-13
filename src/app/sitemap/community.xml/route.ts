import { createAdminClient } from "@/lib/supabase/server";
import {
  ITEMS_PER_PAGE,
  buildUrlEntry,
  wrapUrlset,
  xmlResponse,
} from "@/lib/sitemap-utils";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Number("abc") = NaN → range(NaN, NaN) 이 500 을 낸다. 유한한 값만 쓴다.
    const raw = Number(request.nextUrl.searchParams.get("page") ?? "1");
    const page = Number.isFinite(raw) ? Math.max(1, Math.floor(raw)) : 1;
    const offset = (page - 1) * ITEMS_PER_PAGE;

    const supabase = createAdminClient();
    // 삭제된 글은 404 가 되므로 제외한다.
    const { data: posts } = await supabase
      .from("posts")
      .select("id, updated_at")
      .is("deleted_at", null)
      // id 타이브레이커 없이 정렬하면 created_at 이 같은 행이 페이지 경계에서 중복/누락된다.
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + ITEMS_PER_PAGE - 1);

    if (!posts?.length) {
      return xmlResponse(wrapUrlset(""));
    }

    const urls = posts
      .map((p) =>
        buildUrlEntry(
          `/community/${p.id}`,
          new Date(p.updated_at ?? new Date().toISOString()).toISOString(),
          "daily",
          "0.5",
        ),
      )
      .join("");

    return xmlResponse(wrapUrlset(urls));
  } catch {
    return new Response("Error generating community sitemap", { status: 500 });
  }
}
