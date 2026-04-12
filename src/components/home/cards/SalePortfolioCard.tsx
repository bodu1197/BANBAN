import Link from "next/link";
import { SquareImage } from "../SquareImage";
import { PriceDisplay } from "../PriceDisplay";
import { UserAvatar } from "../UserAvatar";
import type { HomePortfolio } from "@/lib/supabase/home-queries";

interface SalePortfolioCardProps {
  portfolio: HomePortfolio;
  priority?: boolean;
}

export function SalePortfolioCard({
  portfolio,
  priority = false,
}: Readonly<SalePortfolioCardProps>): React.ReactElement {
  return (
    <Link
      href={`/portfolios/${portfolio.id}`}
      className="group inline-block w-[140px] align-top whitespace-normal mr-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <SquareImage
        src={portfolio.imageUrl}
        alt={portfolio.title}
        sizes="140px"
        priority={priority}
      />
      <div className="mt-1.5 space-y-1">
        <UserAvatar name={portfolio.artistName} imageSrc={portfolio.artistProfileImage} />
        <p className="truncate text-xs font-medium transition-colors group-hover:text-brand-primary group-focus-visible:text-brand-primary">
          {portfolio.title}
        </p>
        <PriceDisplay
          price={portfolio.price}
          priceOrigin={portfolio.priceOrigin}
          discountRate={portfolio.discountRate}
        />

      </div>
    </Link>
  );
}
