// @client-reason: Receives onLike callback prop, mouse event handlers for hover effects
"use client";

import { memo, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ArtistCardImage } from "./ArtistCardImage";
import { ArtistCardInfo } from "./ArtistCardInfo";

interface ArtistCardProps {
  id: string;
  name: string;
  region: string;
  profileImage: string | null;
  portfolioImage: string | null;
  genres: string[];
  likesCount: number;
  isLiked?: boolean;
  distance?: number;
    onLikeToggle?: (id: string) => void;
}

export const ArtistCard = memo(function ArtistCard({
  id,
  name,
  region,
  profileImage,
  portfolioImage,
  genres,
  likesCount,
  isLiked = false,
  distance,
  onLikeToggle,
}: Readonly<ArtistCardProps>): React.ReactElement {
  const imageUrl = portfolioImage ?? profileImage ?? "/placeholder-artist.svg";

  const handleLikeClick = useCallback(
    (e: React.MouseEvent): void => {
      e.preventDefault();
      e.stopPropagation();
      onLikeToggle?.(id);
    },
    [id, onLikeToggle]
  );

  return (
    <Link href={`/artists/${id}`} className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="overflow-hidden transition-shadow hover:shadow-lg">
        <ArtistCardImage
          imageUrl={imageUrl}
          name={name}
          isLiked={isLiked}
          distance={distance}
          onLikeClick={handleLikeClick}
        />
        <ArtistCardInfo
          name={name}
          region={region}
          likesCount={likesCount}
          genres={genres}
        />
      </Card>
    </Link>
  );
});
