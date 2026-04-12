import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { PortfolioWithMedia } from "@/lib/supabase/queries";
interface PortfolioArtistSectionProps {
  artistName: string;
  artistAvatar: string | null;
  artistHref: string;
  address: string;
  totalCountLabel: string;
  seeAllLabel: string;
  sectionTitle?: string;
  artistPortfolios: PortfolioWithMedia[];
  artistPortfolioCount: number;
  }

// eslint-disable-next-line max-lines-per-function
export function PortfolioArtistSection({
  artistName,
  artistAvatar,
  artistHref,
  address,
  totalCountLabel,
  seeAllLabel,
  sectionTitle = "Artist",
  artistPortfolios,
  artistPortfolioCount,
  }: Readonly<PortfolioArtistSectionProps>): React.ReactElement {
  return (
    <section className="border-t pt-6">
      {/* Section Title */}
      <h3 className="mb-4 px-4 text-lg font-bold">{sectionTitle}</h3>

      {/* Profile Card - Legacy Style */}
      <div className="mx-4 mb-6 flex items-center gap-3">
        <Link
          href={artistHref}
          className="flex flex-1 items-center gap-3 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border bg-muted">
            {artistAvatar ? (
              <Image
                src={artistAvatar}
                alt={artistName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                {artistName.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate font-bold">{artistName}</p>
            {address && (
              <p className="truncate text-sm text-muted-foreground">{address}</p>
            )}
          </div>
        </Link>
      </div>

      {/* Portfolio Grid Header */}
      <div className="mb-3 flex items-center justify-between px-4">
        <span className="text-sm text-muted-foreground">{totalCountLabel}</span>
      </div>

      {/* Portfolio Grid */}
      <div className="grid grid-cols-3 gap-0.5 px-4">
        {artistPortfolios.slice(0, 9).map((p) => {
          const thumbUrl = p.portfolio_media?.[0]?.storage_path;
          return (
            <Link
              key={p.id}
              href={`/portfolios/${p.id}`}
              className="relative aspect-square overflow-hidden bg-muted transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {thumbUrl ? (
                <Image
                  src={thumbUrl}
                  alt={p.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  No Image
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* See All Button */}
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
