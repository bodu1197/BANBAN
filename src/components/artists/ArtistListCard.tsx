// @client-reason: Like button interaction, image loading states
"use client";

import { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, MapPin, MessageCircle, Star } from "lucide-react";
interface ArtistListCardProps {
  id: string;
  name: string;
  profileImage: string | null;
  portfolioImages: string[];
  region: string;
  address: string;
  rating: number;
  reviewCount: number;
  distance?: number;
  likesCount?: number;
  isLiked?: boolean;
    onLikeToggle?: (id: string) => void;
  likeLabel?: string;
  unlikeLabel?: string;
}

/* eslint-disable max-lines-per-function, complexity -- card with multiple conditional UI sections */
export const ArtistListCard = memo(function ArtistListCard({
  id,
  name,
  profileImage,
  portfolioImages,
  region,
  address,
  rating,
  reviewCount,
  distance,
  isLiked = false,
  onLikeToggle,
  likeLabel = "Like",
  unlikeLabel = "Unlike",
}: Readonly<ArtistListCardProps>): React.ReactElement {
  const handleLikeClick = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    onLikeToggle?.(id);
  };

  const displayImages = portfolioImages.slice(0, 3);
  const placeholderCount = 3 - displayImages.length;

  return (
    <article className="border-b border-border py-4">
      <Link
        href={`/artists/${id}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
      >
        {/* Header: Profile + Info + Like */}
        <div className="mb-3 flex items-start gap-3">
          {/* Profile Image */}
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
            {profileImage ? (
              <Image
                src={profileImage}
                alt={name}
                fill
                className="object-cover"
                sizes="48px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <span className="text-lg">{name.charAt(0)}</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-foreground">{name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              {/* Region Badge */}
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                {region || address}
              </span>
              {/* Rating */}
              <span className="inline-flex items-center gap-0.5 text-amber-500">
                <Star className="h-3 w-3 fill-current" />
                <span>{rating > 0 ? rating.toFixed(1) : "-"}</span>
              </span>
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              {/* Distance */}
              {distance !== undefined && (
                <span className="inline-flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" />
                  {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
                </span>
              )}
              {/* Review Count */}
              <span className="inline-flex items-center gap-0.5">
                <MessageCircle className="h-3 w-3" />
                {reviewCount}
              </span>
            </div>
          </div>

          {/* Like Button */}
          <button
            type="button"
            onClick={handleLikeClick}
            className="shrink-0 rounded-full p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={isLiked ? unlikeLabel : likeLabel}
            aria-pressed={isLiked}
          >
            <Heart
              className={`h-5 w-5 ${isLiked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
            />
          </button>
        </div>

        {/* Portfolio Images - 3 columns */}
        <div className="grid grid-cols-3 gap-1">
          {displayImages.map((img, idx) => (
            <div key={`img-${idx.toString()}`} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
              <Image
                src={img}
                alt={`${name} portfolio ${(idx + 1).toString()}`}
                fill
                className="object-cover"
                sizes="(max-width: 767px) 33vw, 250px"
              />
            </div>
          ))}
          {Array.from({ length: placeholderCount }, (_, idx) => (
            <div
              key={`placeholder-${idx.toString()}`}
              className="aspect-square rounded-lg bg-muted"
            />
          ))}
        </div>
      </Link>
    </article>
  );
});
