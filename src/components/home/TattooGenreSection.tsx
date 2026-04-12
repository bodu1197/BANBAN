// @client-reason: tab switching triggers client-side data fetch
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { SalePortfolioCard } from "./cards/SalePortfolioCard";
import { HorizontalScrollList } from "./HorizontalScrollList";
import type { HomePortfolio } from "@/lib/supabase/home-queries";
import { cn } from "@/lib/utils";

interface Genre {
  id: string;
  name: string;
}

interface TattooGenreSectionProps {
  genres: Genre[];
  initialPortfolios: HomePortfolio[];
  title: string;
}

function GenreTabs({ genres, activeId, onSelect }: Readonly<{
  genres: Genre[];
  activeId: string;
  onSelect: (id: string) => void;
}>): React.ReactElement {
  return (
    <HorizontalScrollList className="mb-3 min-h-0">
      {genres.map((g) => (
        <button
          key={g.id}
          type="button"
          onClick={() => onSelect(g.id)}
          className={cn(
            "mr-2 inline-block shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            activeId === g.id ? "border-orange-700 bg-orange-700 text-white hover:bg-orange-800" : "border-border bg-background text-foreground",

          )}
        >
          {g.name}
        </button>
      ))}
    </HorizontalScrollList>
  );
}

function PortfolioList({ items }: Readonly<{
  items: HomePortfolio[];
}>): React.ReactElement {
  if (items.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">작품이 없습니다</p>;
  }
  return (
    <HorizontalScrollList>
      {items.map((p) => (
        <SalePortfolioCard key={`genre-${p.id}`} portfolio={p} />
      ))}
    </HorizontalScrollList>
  );
}

async function fetchGenreData(genreId: string): Promise<HomePortfolio[]> {
  const res = await fetch(`/api/home/genre-portfolios?categoryId=${genreId}`);
  return (await res.json()) as HomePortfolio[];
}

const PREFETCH_DELAY = 500;
const PREFETCH_INTERVAL = 300;

/** Prefetch all genre data sequentially in the background */
function usePrefetchGenres(genres: Genre[], cacheRef: React.RefObject<Map<string, HomePortfolio[]>>): void {
  useEffect(() => {
    let cancelled = false;
    const timer = globalThis.setTimeout(async () => {
      for (const genre of genres) {
        if (cancelled) break;
        if (cacheRef.current.has(genre.id)) continue;
        try {
          const data = await fetchGenreData(genre.id);
          if (!cancelled) cacheRef.current.set(genre.id, data);
        } catch { /* silent background prefetch */ }
        await new Promise((r) => { globalThis.setTimeout(r, PREFETCH_INTERVAL); });
      }
    }, PREFETCH_DELAY);
    return (): void => { cancelled = true; globalThis.clearTimeout(timer); };
  }, [genres, cacheRef]);
}

export function TattooGenreSection({
  genres,
  initialPortfolios,
  title,
}: Readonly<TattooGenreSectionProps>): React.ReactElement {
  const firstId = genres[0]?.id ?? "";
  const [activeGenre, setActiveGenre] = useState(firstId);
  const [portfolios, setPortfolios] = useState<HomePortfolio[]>(initialPortfolios);
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef(new Map<string, HomePortfolio[]>([[firstId, initialPortfolios]]));
  usePrefetchGenres(genres, cacheRef);

  const handleSelect = useCallback(async (genreId: string) => {
    setActiveGenre(genreId);
    const cached = cacheRef.current.get(genreId);
    if (cached) { setPortfolios(cached); return; }
    setLoading(true);
    try {
      const data = await fetchGenreData(genreId);
      cacheRef.current.set(genreId, data);
      setPortfolios(data);
    } catch { setPortfolios([]); }
    finally { setLoading(false); }
  }, []);

  return (
    <section className="py-4">
      <h2 className="mb-2.5 px-4 text-lg font-bold">{title}</h2>
      <GenreTabs genres={genres} activeId={activeGenre} onSelect={handleSelect} />
      {loading
        ? <div className="flex items-center justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" /></div>
        : <PortfolioList items={portfolios} />}
    </section>
  );
}
