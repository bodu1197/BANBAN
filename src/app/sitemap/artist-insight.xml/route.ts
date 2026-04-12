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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- artist_insights not in generated types yet
    const supabase = createAdminClient() as any;
    const { data } = await supabase
      .from("artist_insights")
      .select("slug, created_at")
      .order("created_at", { ascending: true })
      .range(offset, offset + ITEMS_PER_PAGE - 1);

    const insights = data as Array<{ slug: string; created_at: string }> | null;
    if (!insights?.length) {
      return xmlResponse(wrapUrlset(""));
    }

    const urls = insights
      .map((i: { slug: string; created_at: string }) =>
        buildUrlEntry(
          `/artist-insight/${i.slug}`,
          new Date(i.created_at).toISOString(),
          "monthly",
          "0.6",
        ),
      )
      .join("");

    return xmlResponse(wrapUrlset(urls));
  } catch {
    return new Response("Error generating artist-insight sitemap", { status: 500 });
  }
}
