// @client-reason: Renders portfolio grid with dynamic ad artist highlighting
"use client";

import { GridPortfolioCard } from "@/components/home/cards";
import type { HomePortfolio } from "@/lib/supabase/home-queries";

export function PortfolioGrid({ portfolios, noResults, isLoading, adArtistIds, adPortfolioIds }: Readonly<{
  portfolios: HomePortfolio[];
  noResults: string;
  isLoading: boolean;
  adArtistIds: Set<string>;
  adPortfolioIds?: Set<string>;
}>): React.ReactElement {
  if (isLoading) return <PortfolioSkeleton />;

  if (portfolios.length === 0) {
    return (
      <div className="flex items-center justify-center px-4 py-20">
        <p className="text-muted-foreground">{noResults}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      {portfolios.map((p, i) => (
        <GridPortfolioCard
          key={p.id}
          portfolio={p}
          priority={i < 2}
          isAd={(adPortfolioIds?.has(p.id) ?? false) || adArtistIds.has(p.artistId)}
        />
      ))}
    </div>
  );
}

export function PortfolioSkeleton(): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={`skel-${String(i)}`} className="animate-pulse space-y-2">
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="aspect-square rounded-lg bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-2/3 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
