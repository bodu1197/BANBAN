import Link from "next/link";
import Image from "next/image";
import { Star, ChevronRight } from "lucide-react";
import { UNAVAILABLE_PLACEHOLDER } from "@/lib/ui-placeholders";

export interface ArtistShopCardData {
  artistId: string;
  artistName: string;
  artistAvatar: string | null;
  address: string;
  avgRating: number;
  reviewCount: number;
  eventCount: number;
  portfolioCount: number;
}

export function ArtistShopCard({
  shop,
}: Readonly<{ shop: ArtistShopCardData }>): React.ReactElement {
  const hasRating = shop.reviewCount > 0 && shop.avgRating > 0;

  return (
    <Link
      href={`/artists/${shop.artistId}`}
      className="block rounded-xl border border-border p-4 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border bg-muted">
          {shop.artistAvatar ? (
            <Image
              src={shop.artistAvatar}
              alt=""
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground" aria-hidden>
              {shop.artistName.charAt(0)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h3 className="truncate text-base font-bold">{shop.artistName}</h3>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </div>
          {shop.address ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{shop.address}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-sm">
        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" aria-hidden />
        <span className="font-semibold">{hasRating ? shop.avgRating.toFixed(1) : UNAVAILABLE_PLACEHOLDER}</span>
        {hasRating ? (
          <span className="text-muted-foreground">({shop.reviewCount.toLocaleString()})</span>
        ) : null}
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span>이벤트 <strong className="font-semibold text-foreground">{shop.eventCount}</strong></span>
        <span className="text-border">|</span>
        <span>포트폴리오 <strong className="font-semibold text-foreground">{shop.portfolioCount}</strong></span>
      </div>
    </Link>
  );
}
