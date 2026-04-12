import Link from "next/link";
import { SquareImage } from "../SquareImage";
import { PriceDisplay } from "../PriceDisplay";
import { UserAvatar } from "../UserAvatar";
import { RegionBadge } from "../RegionBadge";
import { IconWithLabel } from "../IconWithLabel";
import { AdBadge } from "./AdBadge";
import type { HomePortfolio } from "@/lib/supabase/home-queries";

interface GridPortfolioCardProps {
  portfolio: HomePortfolio;
  priority?: boolean;
  isAd?: boolean;
}

export function GridPortfolioCard({
  portfolio,
  priority = false,
  isAd = false,
}: Readonly<GridPortfolioCardProps>): React.ReactElement {
  const regionName = portfolio.artistRegion;

  return (
    <Link
      href={`/portfolios/${portfolio.id}`}
      className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* User box ABOVE image (legacy layout) */}
      <div className="mb-1.5">
        <UserAvatar name={portfolio.artistName} imageSrc={portfolio.artistProfileImage} />
      </div>

      <div className="relative">
        {isAd && <AdBadge />}
        <SquareImage
          src={portfolio.imageUrl}
          alt={portfolio.title}
          sizes="(max-width: 767px) 50vw, 200px"
          priority={priority}
        />
      </div>

      <div className="mt-2 space-y-1">
        <IconWithLabel
          icon="/icons/icon_heart.svg"
          label={String(portfolio.likesCount)}
          alt="Likes"
        />
        <p className="truncate text-sm font-medium transition-colors group-hover:text-brand-primary group-focus-visible:text-brand-primary">
          {portfolio.title}
        </p>
        <div className="flex items-center justify-between">
          <PriceDisplay price={portfolio.price} />
          {regionName && (
            <RegionBadge name={regionName} />
          )}
        </div>
      </div>
    </Link>
  );
}
