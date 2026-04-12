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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
    const supabase = createAdminClient() as any;
    const { data } = await supabase
      .from("encyclopedia_articles")
      .select("slug, updated_at")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .range(offset, offset + ITEMS_PER_PAGE - 1);

    const rows = data as Array<{ slug: string; updated_at: string }> | null;
    if (!rows?.length) {
      return xmlResponse(wrapUrlset(""));
    }

    const urls = rows
      .map((r) =>
        buildUrlEntry(
          `/encyclopedia/${r.slug}`,
          new Date(r.updated_at).toISOString(),
          "weekly",
          "0.8",
        ),
      )
      .join("");

    return xmlResponse(wrapUrlset(urls));
  } catch {
    return new Response("Error generating encyclopedia sitemap", { status: 500 });
  }
}
