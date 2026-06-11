import Image from "next/image";
import { MapPin, Star } from "lucide-react";
import type { ArtistWithDetails } from "@/lib/supabase/queries";
import { ArtistHeroCarouselClient } from "./ArtistHeroCarouselClient";
import { CollapsibleIntro } from "./CollapsibleIntro";
import { IntroduceQACards } from "./IntroduceQACards";
import { ArtistLikeButton } from "./ArtistLikeButton";
import { STRINGS } from "@/lib/strings";
import { sanitizeHtmlServerSide } from "@/lib/text-utils";
import { UNAVAILABLE_PLACEHOLDER, UNAVAILABLE_RATING_LABEL } from "@/lib/ui-placeholders";
import { parseBusinessHours, parseIntroduceQA } from "@/types/artist-form";
import { AddressActions } from "./AddressActions";
import { BusinessHours } from "./BusinessHours";

interface ShopHeroBannerProps {
  shop: ArtistWithDetails;
  heroImages: string[];
  reviewCount: number;
  avgRating: number;
  isLiked?: boolean;
}

interface ShopBannerDerived {
  regionName: string;
  displayAddress: string;
  hasIntroduce: boolean;
  description: string | null;
  sanitizedDescription: string | null;
}

function deriveShopBannerData(shop: ArtistWithDetails): ShopBannerDerived {
  const regionName = shop.region?.name ?? "";
  const fullAddress = [shop.address, shop.address_detail].filter(Boolean).join(" ");
  const displayAddress = fullAddress || regionName;

  // introduce(현재 수정 폼이 쓰는 필드)가 있으면 그것만 표시.
  // 비어있을 때만 레거시 description(HTML) 을 fallback 으로 사용 — 기존 회원이 introduce 로
  // 갱신하면 옛 description HTML 이 새 introduce 를 덮어쓰던 버그 차단.
  const hasIntroduce = shop.introduce !== null && shop.introduce !== undefined && shop.introduce.trim().length > 0;
  const description = hasIntroduce ? null : shop.description;
  const sanitizedDescription = description && description.includes("<")
    ? sanitizeHtmlServerSide(description)
    : null;

  return { regionName, displayAddress, hasIntroduce, description, sanitizedDescription };
}

/** introduce_qa(구조화)가 있으면 Q&A 카드, 없으면 기존 평문/레거시 CollapsibleIntro fallback. */
function ShopIntroSection({ shop, hasIntroduce, description, sanitizedDescription }: Readonly<{
  shop: ArtistWithDetails;
  hasIntroduce: boolean;
  description: string | null;
  sanitizedDescription: string | null;
}>): React.ReactElement | null {
  const qa = parseIntroduceQA(shop.introduce_qa);
  if (qa && qa.qa.length > 0) {
    return <IntroduceQACards data={qa} />;
  }
  if (hasIntroduce || description) {
    return (
      <CollapsibleIntro
        text={shop.introduce || ""}
        sanitizedHtml={sanitizedDescription}
        moreLabel={STRINGS.artist.showMore}
        lessLabel={STRINGS.artist.showLess}
      />
    );
  }
  return null;
}

export function ShopHeroBanner({
  shop,
  heroImages,
  reviewCount,
  avgRating,
  isLiked = false,
}: Readonly<ShopHeroBannerProps>): React.ReactElement {
  const { regionName, displayAddress, hasIntroduce, description, sanitizedDescription } =
    deriveShopBannerData(shop);

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
      <ShopIntroSection
        shop={shop}
        hasIntroduce={hasIntroduce}
        description={description}
        sanitizedDescription={sanitizedDescription}
      />
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
          preload
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

function ShopRating({
  avgRating, reviewCount,
}: Readonly<{ avgRating: number; reviewCount: number }>): React.ReactElement {
  const hasRating = reviewCount > 0 && avgRating > 0;
  const ratingText = hasRating ? avgRating.toFixed(1) : UNAVAILABLE_PLACEHOLDER;
  return (
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
  return (
    <div className="px-4 pt-4 pb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight md:text-2xl">{shop.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            반영구 메이크업{regionName ? ` · ${regionName}` : ""}
          </p>
          <ShopRating avgRating={avgRating} reviewCount={reviewCount} />
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
