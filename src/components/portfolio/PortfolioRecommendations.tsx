import Link from "next/link";
import Image from "next/image";
import type { PortfolioRecommendation } from "@/lib/supabase/queries";
interface PriceDisplayProps {
  price: number;
  priceOrigin: number;
  discountRate: number;
  currencyUnit?: string;
}

function PriceDisplay({ price, priceOrigin, discountRate, currencyUnit = "" }: Readonly<PriceDisplayProps>): React.ReactElement {
  const hasDiscount = discountRate > 0;
  const hasOriginalPrice = priceOrigin > 0 && priceOrigin !== price;

  return (
    <div className="flex flex-col gap-0.5">
      {hasOriginalPrice ? (
        <span className="text-xs text-muted-foreground line-through">{priceOrigin.toLocaleString()}{currencyUnit}</span>
      ) : null}
      <div className="flex items-center gap-1">
        {hasDiscount ? <span className="text-xs font-bold text-red-500">{discountRate}%</span> : null}
        <span className="text-sm font-bold">{price.toLocaleString()}{currencyUnit}</span>
      </div>
    </div>
  );
}

interface PortfolioCardProps {
  portfolio: PortfolioRecommendation;
    currencyUnit?: string;
}

function PortfolioCard({ portfolio, currencyUnit }: Readonly<PortfolioCardProps>): React.ReactElement {
  const thumbUrl = portfolio.portfolio_media?.[0]?.storage_path;
  const regionName = portfolio.artist?.region?.name ?? "";

  return (
    <Link
      href={`/portfolios/${portfolio.id}`}
      className="flex w-32 shrink-0 flex-col overflow-hidden rounded-lg bg-card transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {thumbUrl ? (
          <Image src={thumbUrl} alt={portfolio.title} fill className="object-cover" sizes="128px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            No Image
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5 p-2">
        <p className="truncate text-sm font-medium">{portfolio.title}</p>
        <PriceDisplay
          price={portfolio.price ?? 0}
          priceOrigin={portfolio.price_origin}
          discountRate={portfolio.discount_rate ?? 0}
          currencyUnit={currencyUnit}
        />
        {regionName ? <span className="truncate text-xs text-muted-foreground">{regionName}</span> : null}
      </div>
    </Link>
  );
}

interface RecommendationSectionProps {
  title: string;
  portfolios: PortfolioRecommendation[];
    currencyUnit?: string;
}

function RecommendationSection({
  title,
  portfolios,
  currencyUnit,
}: Readonly<RecommendationSectionProps>): React.ReactElement | null {
  if (portfolios.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="mb-3 px-4 text-base font-bold">{title}</h2>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {portfolios.map((p) => (
          <PortfolioCard key={p.id} portfolio={p} currencyUnit={currencyUnit} />
        ))}
      </div>
    </div>
  );
}

interface PortfolioRecommendationLabels {
  recommend: string;
  othersViewed: string;
  lowerPriceTitle: string;
  higherPriceTitle: string;
  samePart: string;
  recommended: string;
  currencyUnit: string;
}

interface PortfolioRecommendationsProps {
  otherCustomersViewed: PortfolioRecommendation[];
  lowerPrice: PortfolioRecommendation[];
  higherPrice: PortfolioRecommendation[];
  sameBodyPart: PortfolioRecommendation[];
  styleSuggestions: PortfolioRecommendation[];
    labels?: PortfolioRecommendationLabels;
}

// eslint-disable-next-line complexity -- multiple recommendation sections with conditional rendering
export function PortfolioRecommendations({
  otherCustomersViewed,
  lowerPrice,
  higherPrice,
  sameBodyPart,
  styleSuggestions,
  labels,
}: Readonly<PortfolioRecommendationsProps>): React.ReactElement | null {
  const hasRecommendations =
    otherCustomersViewed.length > 0 ||
    lowerPrice.length > 0 ||
    higherPrice.length > 0 ||
    sameBodyPart.length > 0 ||
    styleSuggestions.length > 0;

  if (!hasRecommendations) {
    return null;
  }

  return (
    <section className="border-t pt-6">
      <h3 className="mb-4 px-4 text-lg font-bold">{labels?.recommend ?? "Recommend"}</h3>

      <RecommendationSection
        title={labels?.othersViewed ?? "Others Viewed"}
        portfolios={otherCustomersViewed}
        currencyUnit={labels?.currencyUnit}
      />

      <RecommendationSection
        title={labels?.lowerPriceTitle ?? "Lower Price"}
        portfolios={lowerPrice}
        currencyUnit={labels?.currencyUnit}
      />

      <RecommendationSection
        title={labels?.higherPriceTitle ?? "Higher Price"}
        portfolios={higherPrice}
        currencyUnit={labels?.currencyUnit}
      />

      <RecommendationSection
        title={labels?.samePart ?? "Same Part"}
        portfolios={sameBodyPart}
        currencyUnit={labels?.currencyUnit}
      />

      <RecommendationSection
        title={labels?.recommended ?? "Recommended"}
        portfolios={styleSuggestions}
        currencyUnit={labels?.currencyUnit}
      />
    </section>
  );
}
