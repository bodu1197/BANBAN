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
    const { data: portfolios } = await supabase
      .from("portfolios")
      .select("id, updated_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .range(offset, offset + ITEMS_PER_PAGE - 1);

    if (!portfolios?.length) {
      return xmlResponse(wrapUrlset(""));
    }

    const urls = portfolios
      .map((p) =>
        buildUrlEntry(
          `/portfolios/${p.id}`,
          new Date(p.updated_at ?? new Date().toISOString()).toISOString(),
          "weekly",
          "0.7",
        ),
      )
      .join("");

    return xmlResponse(wrapUrlset(urls));
  } catch {
    return new Response("Error generating portfolios sitemap", { status: 500 });
  }
}
