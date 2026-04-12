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
    const { data: exhibitions } = await supabase
      .from("exhibitions")
      .select("id, created_at")
      .order("created_at", { ascending: true })
      .range(offset, offset + ITEMS_PER_PAGE - 1);

    if (!exhibitions?.length) {
      return xmlResponse(wrapUrlset(""));
    }

    const urls = exhibitions
      .map((e) =>
        buildUrlEntry(
          `/exhibition/${e.id}`,
          new Date(e.created_at).toISOString(),
          "weekly",
          "0.6",
        ),
      )
      .join("");

    return xmlResponse(wrapUrlset(urls));
  } catch {
    return new Response("Error generating exhibitions sitemap", { status: 500 });
  }
}
