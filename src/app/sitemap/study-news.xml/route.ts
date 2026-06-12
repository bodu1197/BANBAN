import { createAdminClient } from "@/lib/supabase/server";
import { ITEMS_PER_PAGE, buildUrlEntry, wrapUrlset, xmlResponse } from "@/lib/sitemap-utils";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? "1"));
    const offset = (page - 1) * ITEMS_PER_PAGE;

    const supabase = createAdminClient();
    const { data } = await supabase
      .from("study_news_items")
      .select("slug, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .range(offset, offset + ITEMS_PER_PAGE - 1);

    if (!data?.length) {
      return xmlResponse(wrapUrlset(""));
    }

    const urls = data
      .map((r) => buildUrlEntry(`/study-news/${r.slug}`, r.published_at ? new Date(r.published_at).toISOString() : new Date().toISOString(), "daily", "0.7"))
      .join("");

    return xmlResponse(wrapUrlset(urls));
  } catch {
    return new Response("Error generating study-news sitemap", { status: 500 });
  }
}
