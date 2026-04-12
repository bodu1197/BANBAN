// @client-reason: useSearchParams for reading query, fetch for search API
"use client";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { STRINGS } from "@/lib/strings";
import { GridPortfolioCard } from "@/components/home/cards";
import { AdBadge } from "@/components/home/cards/AdBadge";
import type { HomePortfolio } from "@/lib/supabase/portfolio-common";
import { useSearchFetch } from "./useSearchFetch";

interface ArtistResult {
  id: string;
  name: string;
  profileImage: string | null;
  region: string | null;
  portfolioCount: number;
  isAd: boolean;
}

// --- Tab button ---

function TabButton({ label, active, onClick }: Readonly<{
  label: string; active: boolean; onClick: () => void;
}>): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 py-3 text-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? "border-b-2 border-brand-primary text-brand-primary"
          : "text-muted-foreground hover:text-foreground focus-visible:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

// --- Artist card ---

function ArtistResultCard({ artist }: Readonly<{
  artist: ArtistResult;
}>): React.ReactElement {
  return (
    <Link
      href={`/artists/${artist.id}`}
      className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
        {artist.profileImage ? (
          <Image src={artist.profileImage} alt={artist.name} fill className="object-cover" sizes="48px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg text-muted-foreground">
            {artist.name.charAt(0)}
          </div>
        )}
        {artist.isAd && (
          <div className="absolute -top-0.5 -right-0.5"><AdBadge /></div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{artist.name}</p>
        {artist.region && (
          <span className="mt-0.5 inline-flex items-center gap-0.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {artist.region}
          </span>
        )}
      </div>
    </Link>
  );
}

// --- Content sections ---

function PortfolioResults({ portfolios, adArtistIds, adPortfolioIds }: Readonly<{
  portfolios: HomePortfolio[]; adArtistIds: Set<string>; adPortfolioIds: Set<string>;
}>): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3">
      {portfolios.map((p, i) => (
        <GridPortfolioCard key={p.id} portfolio={p} priority={i < 2} isAd={adPortfolioIds.has(p.id) || adArtistIds.has(p.artistId)} />
      ))}
    </div>
  );
}

function ArtistResults({ artists }: Readonly<{
  artists: ArtistResult[];
}>): React.ReactElement {
  return (
    <div className="space-y-3">
      {artists.map((a) => <ArtistResultCard key={a.id} artist={a} />)}
    </div>
  );
}

function SearchSkeleton(): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={`skel-${String(i)}`} className="animate-pulse space-y-2">
          <div className="aspect-square rounded-lg bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-2/3 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: Readonly<{ message: string }>): React.ReactElement {
  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

// --- Main inner component ---

function SearchResultsInner(): React.ReactElement {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [tab, setTab] = useState<"portfolio" | "artist">("portfolio");
  const d = STRINGS.globalSearch;

  const { portfolios, artists, adArtistIds, adPortfolioIds, isLoading } = useSearchFetch(query);

  const renderContent = useCallback((): React.ReactElement => {
    if (isLoading) return <SearchSkeleton />;
    if (portfolios.length === 0 && artists.length === 0 && query) return <EmptyState message={d.noSearchResults} />;
    if (tab === "artist" && artists.length > 0) return <ArtistResults artists={artists} />;
    if (tab === "portfolio" && portfolios.length > 0) return <PortfolioResults portfolios={portfolios} adArtistIds={adArtistIds} adPortfolioIds={adPortfolioIds} />;
    return <EmptyState message={d.noSearchResults} />;
  }, [isLoading, portfolios, artists, adArtistIds, adPortfolioIds, query, tab, d.noSearchResults]);

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold">{d.searchResults}: &quot;{query}&quot;</h1>
      <div className="mb-4 flex border-b border-border">
        <TabButton label={`${d.portfolioResults} (${portfolios.length})`} active={tab === "portfolio"} onClick={() => setTab("portfolio")} />
        <TabButton label={`${d.artistResults} (${artists.length})`} active={tab === "artist"} onClick={() => setTab("artist")} />
      </div>
      {renderContent()}
    </div>
  );
}

export function SearchResultsClient(): React.ReactElement {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <SearchResultsInner />
    </Suspense>
  );
}
