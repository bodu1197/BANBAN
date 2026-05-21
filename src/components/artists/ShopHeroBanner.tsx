import Image from "next/image";
import { MapPin, Star } from "lucide-react";
import type { ArtistWithDetails } from "@/lib/supabase/queries";
import { ArtistHeroCarouselClient } from "./ArtistHeroCarouselClient";
import { CollapsibleIntro } from "./CollapsibleIntro";
import { ArtistLikeButton } from "./ArtistLikeButton";
import { STRINGS } from "@/lib/strings";
import { sanitizeHtmlServerSide } from "@/lib/text-utils";
import { UNAVAILABLE_PLACEHOLDER, UNAVAILABLE_RATING_LABEL } from "@/lib/ui-placeholders";
import { parseBusinessHours } from "@/types/artist-form";
import { AddressActions } from "./AddressActions";
import { BusinessHours } from "./BusinessHours";

interface ShopHeroBannerProps {
  shop: ArtistWithDetails;
  heroImages: string[];
  reviewCount: number;
  avgRating: number;
  isLiked?: boolean;
}

export function ShopHeroBanner({
  shop,
  heroImages,
  reviewCount,
  avgRating,
  isLiked = false,
}: Readonly<ShopHeroBannerProps>): React.ReactElement {
  const regionName = shop.region?.name ?? "";
  const fullAddress = [shop.address, shop.address_detail].filter(Boolean).join(" ");
  const displayAddress = fullAddress || regionName;

  const description = shop.description;
  const sanitizedDescription = description && description.includes("<")
    ? sanitizeHtmlServerSide(description)
    : null;

  return (
    <section aria-label="샵 정보" className="bg-background">
      <HeroCarousel images={heroImages} shopName={shop.title} />
      <ShopInfo
        shop={shop}
        regionName={regionName}
        displayAddress={displayAddress}
        avgRating={avgRating}
        reviewCount={reviewCount}
        isLiked={isLiked}
      />
      {(shop.introduce || description) ? (
        <CollapsibleIntro
          text={shop.introduce || ""}
          sanitizedHtml={sanitizedDescription}
          moreLabel={STRINGS.artist.showMore}
          lessLabel={STRINGS.artist.showLess}
        />
      ) : null}
    </section>
  );
}

function HeroCarousel({
  images, shopName,
}: Readonly<{ images: string[]; shopName: string }>): React.ReactElement {
  const firstImage = images[0];
  return (
    <div className="relative aspect-[3/1] w-full bg-muted">
      {firstImage ? (
        <Image
          src={firstImage}
          alt={`${shopName} 대표 이미지`}
          fill
          className="object-cover"
          sizes="(min-width: 1024px) 1024px, 100vw"
          priority
          fetchPriority="high"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
          이미지 없음
        </div>
      )}
      {images.length > 1 ? (
        <ArtistHeroCarouselClient
          images={images}
          artistName={shopName}
          previousImageLabel={STRINGS.common.previousImage}
          nextImageLabel={STRINGS.common.nextImage}
        />
      ) : null}
    </div>
  );
}

function ShopInfo({
  shop, regionName, displayAddress, avgRating, reviewCount, isLiked,
}: Readonly<{
  shop: ArtistWithDetails;
  regionName: string;
  displayAddress: string;
  avgRating: number;
  reviewCount: number;
  isLiked: boolean;
}>): React.ReactElement {
  const hasRating = reviewCount > 0 && avgRating > 0;
  const ratingText = hasRating ? avgRating.toFixed(1) : UNAVAILABLE_PLACEHOLDER;
  return (
    <div className="px-4 pt-4 pb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight md:text-2xl">{shop.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            반영구 메이크업{regionName ? ` · ${regionName}` : ""}
          </p>
          <div className="mt-2 inline-flex items-center gap-1 text-sm">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden />
            <span
              className="font-semibold"
              aria-label={hasRating ? `평점 ${ratingText}` : UNAVAILABLE_RATING_LABEL}
            >
              {ratingText}
            </span>
            <span className="text-muted-foreground">({reviewCount.toLocaleString()})</span>
          </div>
        </div>
        <ArtistLikeButton
          artistId={shop.id}
          initialIsLiked={isLiked}
          initialCount={shop.likes_count ?? 0}
          label={STRINGS.artist.likes}
        />
      </div>
      {displayAddress ? (
        <div className="mt-3 space-y-2">
          <p className="flex items-start gap-1 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{displayAddress}</span>
          </p>
          <AddressActions address={displayAddress} />
        </div>
      ) : null}
      {shop.business_hours ? (
        <BusinessHours hours={parseBusinessHours(shop.business_hours)} />
      ) : null}
    </div>
  );
}
