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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- courses not in generated types yet
    const supabase = createAdminClient() as any;
    const { data } = await supabase
      .from("courses")
      .select("id, updated_at")
      .order("created_at", { ascending: true })
      .range(offset, offset + ITEMS_PER_PAGE - 1);

    const courses = data as Array<{ id: string; updated_at: string }> | null;
    if (!courses?.length) {
      return xmlResponse(wrapUrlset(""));
    }

    const urls = courses
      .map((c: { id: string; updated_at: string }) =>
        buildUrlEntry(
          `/courses/${c.id}`,
          new Date(c.updated_at).toISOString(),
          "monthly",
          "0.6",
        ),
      )
      .join("");

    return xmlResponse(wrapUrlset(urls));
  } catch {
    return new Response("Error generating courses sitemap", { status: 500 });
  }
}
