import { PortfolioArtistSection } from "./PortfolioArtistSection";
import { PortfolioRecommendations } from "./PortfolioRecommendations";
import { getAvatarUrl } from "@/lib/supabase/storage-utils";
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
  recommendations,
}: Readonly<PortfolioSecondarySectionProps>): React.ReactElement {
  const artistAvatar = getAvatarUrl(artist.profile_image_path);
  const address = artist.region?.name ?? artist.address ?? "";
  const totalCountLabel = STRINGS.artist.totalCount.replace("{count}", String(artistPortfolioCount));

  return (
    <>
      <PortfolioArtistSection
        artistName={artist.title}
        artistAvatar={artistAvatar}
        artistHref={`/artists/${artist.id}`}
        address={address}
        totalCountLabel={totalCountLabel}
        seeAllLabel={STRINGS.common.seeAll}
        sectionTitle={STRINGS.pages.artistsList}
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
