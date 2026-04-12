import { MapPin, MessageSquare } from "lucide-react";
import Image from "next/image";
import type { ArtistWithDetails } from "@/lib/supabase/queries";
import { ArtistHeroCarouselClient } from "./ArtistHeroCarouselClient";
import { CollapsibleIntro } from "./CollapsibleIntro";
import { ArtistLikeButton } from "./ArtistLikeButton";
import { STRINGS } from "@/lib/strings";

/* eslint-disable max-lines-per-function, complexity */
interface ArtistHeaderProps {
  artist: ArtistWithDetails;
    portfolioImages: string[];
  avatarUrl: string | null;
  reviewCount: number;
  isLiked?: boolean;

}

export function ArtistHeader({
  artist,
  portfolioImages,
  avatarUrl,
  reviewCount,
  isLiked = false,
}: Readonly<ArtistHeaderProps>): React.ReactElement {
  const regionName = artist.region?.name ?? "";
  const address = regionName || artist.address;

  const introduction = artist.introduce;
  const description = artist.description;

  const firstImage = portfolioImages[0];

  return (
    <section>
      {/* Hero Image Section */}
      <div className="relative">
        {/* First image rendered server-side with priority for LCP */}
        {firstImage ? (
          <div className="relative aspect-[4/3] w-full">
            <Image
              src={firstImage}
              alt={`${artist.title} 1`}
              fill
              className="object-cover"
              sizes="(max-width: 767px) 100vw, 767px"
              priority
              fetchPriority="high"
            />
          </div>
        ) : (
          <div className="aspect-[4/3] w-full bg-muted" />
        )}

        {/* Carousel overlay for navigation (handles all images including first) */}
        {portfolioImages.length > 1 && (
          <ArtistHeroCarouselClient
            images={portfolioImages}
            artistName={artist.title}
            previousImageLabel={STRINGS.common.previousImage}
            nextImageLabel={STRINGS.common.nextImage}
          />
        )}
      </div>

      {/* Artist Info Section - Gray Background */}
      <div className="bg-muted/50">
        <div className="px-4 pb-4 pt-3">
          {/* Profile Row */}
          <div className="flex items-start gap-3">
            {/* Avatar */}
            {avatarUrl && (
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-background shadow-md">
                <Image
                  src={avatarUrl}
                  alt={artist.title}
                  width={56}
                  height={56}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between">
                <h1 className="text-lg font-bold">{artist.title}</h1>
                <ArtistLikeButton
                  artistId={artist.id}
                  initialIsLiked={isLiked}
                  initialCount={artist.likes_count}
                  label={STRINGS.artist.likes}
                />
              </div>

              {/* Location & Stats */}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {address && (
                  <span className="flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5">
                    <MapPin className="h-3 w-3" />
                    {address}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {reviewCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Introduction / Description */}
        {(introduction || description) && (
          <CollapsibleIntro
            text={introduction || ""}
            htmlContent={description}
            moreLabel={STRINGS.artist.showMore}
            lessLabel={STRINGS.artist.showLess}
          />
        )}

      </div>
    </section>
  );
}
