import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/auth";

interface PortfolioRow {
  id: string;
  title: string;
}

interface MediaRow {
  portfolio_id: string;
  storage_path: string;
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
    .select("id, title")
    .eq("artist_id", artistId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (!portfolios || portfolios.length === 0) {
    return NextResponse.json({ portfolios: [] });
  }

  const portfolioIds = (portfolios as PortfolioRow[]).map((p) => p.id);

  const { data: media } = await supabase
    .from("portfolio_media")
    .select("portfolio_id, storage_path")
    .in("portfolio_id", portfolioIds)
    .eq("order_index", 0);

  const mediaMap = new Map(
    (media as MediaRow[] | null)?.map((m) => [m.portfolio_id, m.storage_path]) ?? []
  );

  const result = (portfolios as PortfolioRow[]).map((p) => ({
    id: p.id,
    title: p.title,
    thumbnail_path: mediaMap.get(p.id) ?? null,
  }));

  return NextResponse.json({ portfolios: result });
}
