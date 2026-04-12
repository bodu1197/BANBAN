import { unstable_cache } from "next/cache";
import { createStaticClient } from "./server";
import { type PortfolioRow, SELECT_BASIC, mapPortfolioRow, type HomePortfolio } from "./portfolio-common";
import { secureShuffle } from "@/lib/random";

export interface TattooGenre {
  id: string;
  name: string;
  orderIndex: number;
}

/** Max order_index for style genres only (themes/body parts excluded) */
const MAX_GENRE_ORDER = 17;

export async function fetchTattooGenres(): Promise<TattooGenre[]> {
  return unstable_cache(
    async () => {
      const supabase = createStaticClient();
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, order_index")
        .eq("artist_type", "TATTOO")
        .is("parent_id", null)
        .lte("order_index", MAX_GENRE_ORDER)
        .order("order_index");

      if (error) {
        throw new Error(`Failed to fetch tattoo genres: ${error.message}`);
      }

      return (data ?? []).map((c: { id: string; name: string; order_index: number }) => ({
        id: c.id,
        name: c.name,
        orderIndex: c.order_index,
      }));
    },
    ["tattoo-genres"],
    { revalidate: 300, tags: ["home", "categories"] },
  )();
}

export async function fetchGenrePortfolios(categoryId: string, limit = 10): Promise<HomePortfolio[]> {
  return unstable_cache(
    async () => {
      const supabase = createStaticClient();
      const now = new Date().toISOString();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types
      const { data, error } = await (supabase as any)
        .rpc("search_portfolios_by_category_ids", { p_category_ids: [categoryId], p_type_artist: "TATTOO" })
        .select(SELECT_BASIC)
        .gt("price", 0)
        .or(`sale_ended_at.is.null,sale_ended_at.gte.${now}`)
        .order("likes_count", { ascending: false })
        .limit(limit * 3);

      if (error) {
        throw new Error(`Failed to fetch genre portfolios: ${error.message}`);
      }

      return secureShuffle((data ?? []) as PortfolioRow[]).slice(0, limit).map(mapPortfolioRow);
    },
    [`genre-portfolios-${categoryId}`],
    { revalidate: 60, tags: ["home", "portfolios"] },
  )();
}
