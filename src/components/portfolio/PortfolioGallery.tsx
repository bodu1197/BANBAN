import Image from "next/image";
import Link from "next/link";
import type { PortfolioWithMedia } from "@/lib/supabase/queries";
interface PortfolioGalleryProps {
  portfolios: PortfolioWithMedia[];
}

interface PortfolioItem {
  portfolioId: string;
  mediaId: string;
  storage_path: string;
  portfolioTitle: string;
}

export function PortfolioGallery({
  portfolios,
}: Readonly<PortfolioGalleryProps>): React.ReactElement {
  // Get first media from each portfolio for the grid
  const portfolioItems: PortfolioItem[] = portfolios
    .filter((portfolio) => portfolio.portfolio_media.length > 0)
    .map((portfolio) => {
      const firstMedia = portfolio.portfolio_media[0];
      return {
        portfolioId: portfolio.id,
        mediaId: firstMedia?.id ?? "",
        storage_path: firstMedia?.storage_path ?? "",
        portfolioTitle: portfolio.title,
      };
    });

  return (
    <div className="grid grid-cols-3 gap-1 md:grid-cols-3 lg:grid-cols-4">
      {portfolioItems.map((item) => (
        <Link
          key={item.portfolioId}
          href={`/portfolios/${item.portfolioId}`}
          className="group relative aspect-square overflow-hidden rounded-lg bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Image
            src={item.storage_path}
            alt={item.portfolioTitle}
            fill
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform group-hover:scale-105 group-focus-visible:scale-105"
          />
        </Link>
      ))}
    </div>
  );
}
