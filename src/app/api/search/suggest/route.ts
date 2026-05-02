import { NextResponse, type NextRequest } from "next/server";
import { createStaticClient } from "@/lib/supabase/server";
import { isChoseongQuery, buildChoseongRegex } from "@/lib/utils/hangul";

interface SuggestItem {
  id: string;
  title: string;
  type: "artist" | "portfolio";
  extra?: string;
}

const SUGGEST_LIMIT = 10;
const CACHE_TTL = 300;

const MAX_QUERY_LEN = 50;

function sanitize(input: string): string {
  return input.replace(/[<>"'&.*+?^${}()|[\]\\]/g, "").trim().slice(0, MAX_QUERY_LEN);
}

type SupabaseClient = ReturnType<typeof createStaticClient>;

function applyFilter(query: ReturnType<SupabaseClient["from"]>, q: string, isChosung: boolean): void {
  if (isChosung) {
    query.filter("title", "~", buildChoseongRegex(q));
  } else {
    query.ilike("title", `%${q}%`);
  }
}

function mapResults(
  artists: { id: string; title: string; region: { name: string } | null }[],
  portfolios: { id: string; title: string; artist: { title: string } }[],
): SuggestItem[] {
  const items: SuggestItem[] = [];
  for (const a of artists) {
    items.push({ id: a.id, title: a.title, type: "artist", extra: a.region?.name ?? undefined });
  }
  for (const p of portfolios) {
    items.push({ id: p.id, title: p.title, type: "portfolio", extra: p.artist?.title ?? undefined });
  }
  return items.slice(0, SUGGEST_LIMIT);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const raw = request.nextUrl.searchParams.get("q")?.trim();
  if (!raw || raw.length < 1) {
    return NextResponse.json({ items: [] });
  }

  const q = sanitize(raw);
  if (!q) return NextResponse.json({ items: [] });

  const supabase = createStaticClient();
  const isChosung = isChoseongQuery(q);

  const artistQuery = supabase
    .from("artists")
    .select("id, title, region:regions(name)")
    .is("deleted_at", null)
    .eq("is_hide", false)
    .eq("status", "active")
    .order("likes_count", { ascending: false })
    .limit(SUGGEST_LIMIT);

  const portfolioQuery = supabase
    .from("portfolios")
    .select("id, title, artist:artists!inner(title, is_hide, deleted_at)")
    .is("deleted_at", null)
    .gt("price", 0)
    .is("artists.deleted_at", null)
    .eq("artists.is_hide", false)
    .order("likes_count", { ascending: false })
    .limit(SUGGEST_LIMIT);

  applyFilter(artistQuery, q, isChosung);
  applyFilter(portfolioQuery, q, isChosung);

  const [{ data: artists }, { data: portfolios }] = await Promise.all([artistQuery, portfolioQuery]);

  const items = mapResults(
    (artists ?? []) as { id: string; title: string; region: { name: string } | null }[],
    (portfolios ?? []) as { id: string; title: string; artist: { title: string } }[],
  );

  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=60` } },
  );
}
