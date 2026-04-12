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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- blog_posts not in generated types yet
    const supabase = createAdminClient() as any;
    const { data } = await supabase
      .from("blog_posts")
      .select("slug, created_at")
      .order("created_at", { ascending: true })
      .range(offset, offset + ITEMS_PER_PAGE - 1);

    const posts = data as Array<{ slug: string; created_at: string }> | null;
    if (!posts?.length) {
      return xmlResponse(wrapUrlset(""));
    }

    const urls = posts
      .map((p: { slug: string; created_at: string }) =>
        buildUrlEntry(
          `/blog/${p.slug}`,
          new Date(p.created_at).toISOString(),
          "monthly",
          "0.7",
        ),
      )
      .join("");

    return xmlResponse(wrapUrlset(urls));
  } catch {
    return new Response("Error generating blog sitemap", { status: 500 });
  }
}
