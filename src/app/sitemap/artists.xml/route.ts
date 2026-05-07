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
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? "1"));
    const offset = (page - 1) * ITEMS_PER_PAGE;

    const supabase = createAdminClient();
    const { data: artists } = await supabase
      .from("artists")
      .select("id, updated_at")
      .is("deleted_at", null)
      .eq("is_hide", false)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .range(offset, offset + ITEMS_PER_PAGE - 1);

    if (!artists?.length) {
      return xmlResponse(wrapUrlset(""));
    }

    const urls = artists
      .map((a) =>
        buildUrlEntry(
          `/artists/${a.id}`,
          new Date(a.updated_at ?? new Date().toISOString()).toISOString(),
          "weekly",
          "0.7",
        ),
      )
      .join("");

    return xmlResponse(wrapUrlset(urls));
  } catch {
    return new Response("Error generating artists sitemap", { status: 500 });
  }
}
