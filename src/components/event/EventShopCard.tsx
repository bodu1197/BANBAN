import { ArtistShopCard, type ArtistShopCardData } from "@/components/shared/ArtistShopCard";

export interface EventShopData extends ArtistShopCardData {
  shopName: string | null;
  shopRegion: string | null;
  shopBusinessHours: string | null;
  shopParking: string | null;
  shopBookingMethod: string | null;
}

export function EventShopCard({
  shop,
}: Readonly<{ shop: EventShopData }>): React.ReactElement {
  const cardData: ArtistShopCardData = {
    artistId: shop.artistId,
    artistName: shop.artistName,
    artistAvatar: shop.artistAvatar,
    address: shop.shopRegion || shop.address,
    avgRating: shop.avgRating,
    reviewCount: shop.reviewCount,
    eventCount: shop.eventCount,
    portfolioCount: shop.portfolioCount,
  };

  return (
    <div className="space-y-3">
      <ArtistShopCard shop={cardData} />
      {(shop.shopBusinessHours || shop.shopParking || shop.shopBookingMethod) ? (
        <div className="space-y-1.5 rounded-lg border border-dashed border-input px-4 py-3 text-xs text-muted-foreground">
          {shop.shopBusinessHours ? <p>영업시간: {shop.shopBusinessHours}</p> : null}
          {shop.shopParking ? <p>주차: {shop.shopParking}</p> : null}
          {shop.shopBookingMethod ? <p>예약: {shop.shopBookingMethod}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
