// @client-reason: Uses useInfiniteScroll hook, useState for grid state, receives onLike callback
"use client";

import { ArtistCard } from "./ArtistCard";
import { ArtistCardSkeleton } from "./ArtistCardSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";

interface Artist {
  id: string;
  name: string;
  region: string;
  profileImage: string | null;
  portfolioImage: string | null;
  genres: string[];
  likesCount: number;
  isLiked?: boolean;
  distance?: number;
}

interface ArtistGridProps {
  artists: Artist[];
    isLoading?: boolean;
  skeletonCount?: number;
  onLikeToggle?: (id: string) => void;
  emptyMessage?: string;
}

export function ArtistGrid({
  artists,
  isLoading = false,
  skeletonCount = 8,
  onLikeToggle,
  emptyMessage = "No artists found",
}: Readonly<ArtistGridProps>): React.ReactElement {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: skeletonCount }, (_, i) => (
          <ArtistCardSkeleton key={`skeleton-${i.toString()}`} />
        ))}
      </div>
    );
  }

  if (artists.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {artists.map((artist) => (
        <ArtistCard
          key={artist.id}
          {...artist}
          onLikeToggle={onLikeToggle}
        />
      ))}
    </div>
  );
}
