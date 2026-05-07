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
    const { data: posts } = await supabase
      .from("posts")
      .select("id, updated_at")
      .order("created_at", { ascending: true })
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
