// @client-reason: useState for image loading state, onLoad/onError event handlers
"use client";

import { memo } from "react";
import Image from "next/image";
import { Heart, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistance } from "@/lib/geo";

interface ArtistCardImageProps {
  imageUrl: string;
  name: string;
  isLiked: boolean;
  distance?: number;
  onLikeClick: (e: React.MouseEvent) => void;
}

export const ArtistCardImage = memo(function ArtistCardImage({
  imageUrl,
  name,
  isLiked,
  distance,
  onLikeClick,
}: Readonly<ArtistCardImageProps>): React.ReactElement {
  return (
    <div className="relative aspect-square">
      <Image
        src={imageUrl}
        alt={name}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        className="object-cover transition-transform group-hover:scale-105 group-focus-visible:scale-105"
      />
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "absolute right-2 top-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur",
          isLiked && "text-red-500"
        )}
        onClick={onLikeClick}
        aria-label={isLiked ? "Unlike artist" : "Like artist"}
        aria-pressed={isLiked}
      >
        <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
      </Button>

      {distance !== undefined && (
        <Badge
          variant="secondary"
          className="absolute bottom-2 left-2 bg-background/80 backdrop-blur"
        >
          <MapPin className="mr-1 h-3 w-3" />
          {formatDistance(distance)}
        </Badge>
      )}
    </div>
  );
});
