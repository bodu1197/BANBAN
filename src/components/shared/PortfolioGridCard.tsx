import Image from "next/image";
import Link from "next/link";
import { PriceDisplay } from "@/components/home/PriceDisplay";
import type { HomePortfolio } from "@/lib/supabase/home-queries";

interface PortfolioGridCardProps {
  portfolio: HomePortfolio;
  showDiscount?: boolean;
}

export function PortfolioGridCard({
  portfolio: p,
  showDiscount = false,
}: Readonly<PortfolioGridCardProps>): React.ReactElement {
  const regionName = p.artistRegion;

  return (
    <Link
      href={`/portfolios/${p.id}`}
      className="group block overflow-hidden rounded-lg border transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-square bg-muted">
        {p.imageUrl ? (
          <Image
            src={p.imageUrl}
            alt={p.title}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform group-hover:scale-105 group-focus-visible:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            No Image
          </div>
        )}
        {showDiscount && p.discountRate > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
            {String(p.discountRate)}%
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-semibold">{p.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {p.artistName}{regionName ? ` · ${regionName}` : ""}
        </p>
        <PriceDisplay price={p.price} priceOrigin={p.priceOrigin} discountRate={p.discountRate} />
      </div>
    </Link>
  );
}
