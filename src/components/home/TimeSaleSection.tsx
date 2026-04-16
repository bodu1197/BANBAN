import Link from "next/link";
import { SquareImage } from "./SquareImage";
import { PriceDisplay } from "./PriceDisplay";
import { UserAvatar } from "./UserAvatar";
import { HorizontalScrollList } from "./HorizontalScrollList";
import type { HomePortfolio } from "@/lib/supabase/home-queries";
import { CountdownTimer } from "./CountdownTimer";

function TimeSaleCard({ portfolio, priority }: Readonly<{
  portfolio: HomePortfolio;
  priority?: boolean;
}>): React.ReactElement {
  return (
    <Link
      href={`/portfolios/${portfolio.id}`}
      className="group inline-block w-[140px] align-top whitespace-normal mr-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative">
        <SquareImage src={portfolio.imageUrl} alt={portfolio.title} sizes="140px" priority={priority} />
        {portfolio.discountRate > 0 && (
          <span className="absolute left-1 top-1 rounded bg-red-700 px-1.5 py-0.5 text-xs font-bold text-white shadow-sm">
            {portfolio.discountRate}%
          </span>

        )}
      </div>
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

export function TimeSaleSection({ items, title, moreLink, moreText }: Readonly<{
  items: HomePortfolio[];
  title: string;
  moreLink: string;
  moreText?: string;
}>): React.ReactElement | null {
  if (items.length === 0) return null;

  const earliestEnd = items
    .map((p) => p.saleEndedAt)
    .filter((d): d is string => d !== null)
    .sort()[0];

  return (
    <section className="py-4">
      <div className="flex items-center justify-between px-4 mb-2.5">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          {earliestEnd && <CountdownTimer endDate={earliestEnd} />}
        </div>
        <Link
          href={moreLink}
          className="text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          {moreText}
        </Link>
      </div>
      <HorizontalScrollList>
        {items.map((p, i) => (
          <TimeSaleCard key={p.id} portfolio={p} priority={i === 0} />
        ))}
      </HorizontalScrollList>
    </section>
  );
}
