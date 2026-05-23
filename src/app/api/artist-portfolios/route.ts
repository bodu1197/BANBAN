import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/auth";

interface PortfolioRow {
  id: string;
  title: string;
  portfolio_media: Array<{ storage_path: string; order_index: number }>;
}

/**
 * GET /api/artist-portfolios?artistId=xxx
 * Returns the artist's portfolios with thumbnails. Auth-gated.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const artistId = new URL(request.url).searchParams.get("artistId");
  if (!artistId) {
    return NextResponse.json({ error: "artistId is required" }, { status: 400 });
  }

  const supabase = await createClient();

  // Verify user owns this artist profile
  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("id", artistId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!artist) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: portfolios } = await supabase
    .from("portfolios")
    .select("id, title, portfolio_media(storage_path, order_index)")
    .eq("artist_id", artistId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (!portfolios || portfolios.length === 0) {
    return NextResponse.json({ portfolios: [] });
  }

  const result = (portfolios as PortfolioRow[]).map((p) => {
    const thumbnail = p.portfolio_media
      ?.filter((m) => m.order_index === 0)
      .map((m) => m.storage_path)[0] ?? null;
    return {
      id: p.id,
      title: p.title,
      thumbnail_path: thumbnail,
    };
  });

  return NextResponse.json({ portfolios: result });
}
