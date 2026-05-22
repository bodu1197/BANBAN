import { PortfolioArtistSection } from "./PortfolioArtistSection";
import { PortfolioRecommendations } from "./PortfolioRecommendations";
import { ArtistShopCard, type ArtistShopCardData } from "@/components/shared/ArtistShopCard";
import { STRINGS } from "@/lib/strings";
import type { PortfolioWithMedia, PortfolioRecommendation } from "@/lib/supabase/queries";

interface PortfolioSecondarySectionProps {
  artist: {
    id: string;
    title: string;
    profile_image_path: string | null;
    address: string;
    region?: { name: string } | null;
  };
  artistPortfolios: PortfolioWithMedia[];
  artistPortfolioCount: number;
  shopStats: ArtistShopCardData;
  recommendations: {
    otherCustomersViewed: PortfolioRecommendation[];
    lowerPrice: PortfolioRecommendation[];
    higherPrice: PortfolioRecommendation[];
    sameBodyPart: PortfolioRecommendation[];
    styleSuggestions: PortfolioRecommendation[];
  };
}

export function PortfolioSecondarySection({
  artist,
  artistPortfolios,
  artistPortfolioCount,
  shopStats,
  recommendations,
}: Readonly<PortfolioSecondarySectionProps>): React.ReactElement {
  const totalCountLabel = STRINGS.artist.totalCount.replace("{count}", String(artistPortfolioCount));

  return (
    <>
      <section className="border-t px-4 py-6">
        <h2 className="mb-3 text-base font-bold">샵 정보</h2>
        <ArtistShopCard shop={shopStats} />
      </section>

      <PortfolioArtistSection
        artistHref={`/artists/${artist.id}`}
        totalCountLabel={totalCountLabel}
        seeAllLabel={STRINGS.common.seeAll}
        sectionTitle={artist.title}
        artistPortfolios={artistPortfolios}
        artistPortfolioCount={artistPortfolioCount}
      />
      <PortfolioRecommendations
        otherCustomersViewed={recommendations.otherCustomersViewed}
        lowerPrice={recommendations.lowerPrice}
        higherPrice={recommendations.higherPrice}
        sameBodyPart={recommendations.sameBodyPart}
        styleSuggestions={recommendations.styleSuggestions}
        labels={{
          recommend: STRINGS.portfolio.recommend,
          othersViewed: STRINGS.portfolio.othersViewed,
          lowerPriceTitle: STRINGS.portfolio.lowerPrice,
          higherPriceTitle: STRINGS.portfolio.higherPrice,
          samePart: STRINGS.portfolio.samePart,
          recommended: STRINGS.portfolio.recommended,
          currencyUnit: STRINGS.common.currencyUnit,
        }}
      />
    </>
  );
}
