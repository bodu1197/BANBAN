import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PortfolioWithMedia } from "@/lib/supabase/queries";

interface PortfolioArtistSectionProps {
  artistHref: string;
  totalCountLabel: string;
  seeAllLabel: string;
  sectionTitle: string;
  artistPortfolios: PortfolioWithMedia[];
  artistPortfolioCount: number;
}

function PortfolioThumb({ id, title, thumbUrl }: Readonly<{ id: string; title: string; thumbUrl: string | undefined }>): React.ReactElement {
  return (
    <Link
      href={`/portfolios/${id}`}
      className="relative aspect-square overflow-hidden bg-muted transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {thumbUrl ? (
        <Image src={thumbUrl} alt={title} fill className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">No Image</div>
      )}
    </Link>
  );
}

export function PortfolioArtistSection({
  artistHref,
  totalCountLabel,
  seeAllLabel,
  sectionTitle,
  artistPortfolios,
  artistPortfolioCount,
}: Readonly<PortfolioArtistSectionProps>): React.ReactElement {
  return (
    <section className="border-t pt-6">
      <Link
        href={artistHref}
        className="mb-4 flex min-h-11 items-center justify-between px-4 transition-opacity hover:opacity-70 focus-visible:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-md"
      >
        <h3 className="text-lg font-bold">{sectionTitle}</h3>
        <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden />
      </Link>

      <div className="mb-3 flex items-center justify-between px-4">
        <span className="text-sm text-muted-foreground">{totalCountLabel}</span>
      </div>

      <div className="grid grid-cols-3 gap-0.5 px-4">
        {artistPortfolios.slice(0, 9).map((p) => (
          <PortfolioThumb key={p.id} id={p.id} title={p.title} thumbUrl={p.portfolio_media?.[0]?.storage_path} />
        ))}
      </div>

      {artistPortfolioCount > 9 && (
        <div className="mt-4 px-4">
          <Button variant="outline" className="w-full" asChild>
            <Link href={artistHref}>{seeAllLabel}</Link>
          </Button>
        </div>
      )}
    </section>
  );
}
