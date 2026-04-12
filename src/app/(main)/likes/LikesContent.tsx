// @client-reason: Tab state, client-side data fetching for liked portfolios
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArtistGrid } from "@/components/artists";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchLikedPortfolios,
  type LikedPortfolio,
} from "@/lib/supabase/likes-queries";

interface LikedArtist {
  id: string;
  name: string;
  region: string;
  portfolioImage: string | null;
  likesCount: number;
}

interface LikesContentProps {
  artists: LikedArtist[];
    labels: { portfolios: string; artists: string; noData: string };
}

const EMPTY_GENRES: string[] = [];

function PortfolioGridSkeleton(): React.ReactElement {
  return (
    <div className="grid grid-cols-3 gap-1">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={`skel-${i.toString()}`} className="aspect-square animate-pulse rounded bg-muted" />
      ))}
    </div>
  );
}

function LikedPortfolioGrid({ portfolios, noData }: Readonly<{
  portfolios: LikedPortfolio[];
    noData: string;
}>): React.ReactElement {
  if (portfolios.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">{noData}</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {portfolios.map((portfolio) => (
        <Link
          key={portfolio.id}
          href={`/portfolios/${portfolio.id}`}
          className="relative block overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="relative aspect-square">
            <Image
              src={portfolio.imageUrl ?? "/placeholder-image.svg"}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 767px) 33vw, 250px"
            />
          </div>
        </Link>
      ))}
    </div>
  );
}

function TabButton({ label, count, isActive, onClick }: Readonly<{
  label: string; count: number; isActive: boolean; onClick: () => void;
}>): React.ReactElement {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={`flex-1 py-3 text-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isActive ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      {count > 0 && <span className="ml-1 text-xs text-muted-foreground">({count})</span>}
    </button>
  );
}

function useLikedPortfolios(): { portfolios: LikedPortfolio[]; isLoading: boolean } {
  const { user } = useAuth();
  const [portfolios, setPortfolios] = useState<LikedPortfolio[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    fetchLikedPortfolios(user.id, 100).then((data) => {
      if (mounted) { setPortfolios(data); setIsLoading(false); }
    });
    return () => { mounted = false; };
  }, [user]);

  return { portfolios, isLoading };
}

function useArtistMap(artists: Readonly<LikedArtist[]>): Array<{
  id: string; name: string; region: string; profileImage: null;
  portfolioImage: string | null; genres: string[]; likesCount: number; isLiked: boolean;
}> {
  return useMemo(
    () => artists.map((a) => ({
      id: a.id, name: a.name, region: a.region, profileImage: null,
      portfolioImage: a.portfolioImage, genres: EMPTY_GENRES, likesCount: a.likesCount, isLiked: true,
    })),
    [artists],
  );
}

export function LikesContent({ artists, labels }: Readonly<LikesContentProps>): React.ReactElement {
  const [activeTab, setActiveTab] = useState<"portfolios" | "artists">("portfolios");
  const { portfolios, isLoading } = useLikedPortfolios();
  const mappedArtists = useArtistMap(artists);

  return (
    <div className="mt-4">
      <div className="flex border-b" role="tablist" aria-label="Likes tabs">
        <TabButton label={labels.portfolios} count={portfolios.length} isActive={activeTab === "portfolios"} onClick={() => setActiveTab("portfolios")} />
        <TabButton label={labels.artists} count={artists.length} isActive={activeTab === "artists"} onClick={() => setActiveTab("artists")} />
      </div>
      {activeTab === "portfolios" && (
        <div className="mt-4" role="tabpanel">
          {isLoading ? <PortfolioGridSkeleton /> : <LikedPortfolioGrid portfolios={portfolios} noData={labels.noData} />}
        </div>
      )}
      {activeTab === "artists" && (
        <div className="mt-4" role="tabpanel">
          <ArtistGrid artists={mappedArtists} emptyMessage={labels.noData} />
        </div>
      )}
    </div>
  );
}
