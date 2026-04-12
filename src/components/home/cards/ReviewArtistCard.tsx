import Link from "next/link";
import Image from "next/image";
import { ArtistMetaInfo } from "../ArtistMetaInfo";
import type { ReviewedArtist } from "@/lib/supabase/home-queries";

interface ReviewArtistCardProps {
  artist: ReviewedArtist;
  priority?: boolean;
}

function PortfolioPreviewGrid({
  images,
  artistName,
  priority = false,
}: Readonly<{ images: readonly string[]; artistName: string; priority?: boolean }>): React.ReactElement {
  return (
    <div className="mt-[30px] grid grid-cols-3 gap-2">
      {Array.from({ length: 3 }, (_, i) => {
        const src = i < images.length ? (images.at(i) ?? null) : null;
        return (
          <div key={`preview-${i.toString()}`} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
            {src ? (
              <Image
                src={src}
                alt={`${artistName} ${String(i + 1)}`}
                fill
                sizes="80px"
                quality={70}
                className="object-cover"
                priority={priority}
              />
            ) : (
              <div className="h-full w-full bg-muted" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ReviewArtistCard({
  artist,
  priority = false,
}: Readonly<ReviewArtistCardProps>): React.ReactElement {
  return (
    <Link
      href={`/artists/${artist.id}`}
      className="group inline-block w-[280px] align-top whitespace-normal mr-2.5 snap-start rounded-[20px] border border-muted p-[25px] transition-colors hover:border-brand-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Top: name+reviews+region LEFT, avatar RIGHT */}
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1 pr-5">
          <p className="truncate text-xl font-semibold transition-colors group-hover:text-brand-primary group-focus-visible:text-brand-primary">
            {artist.title}
          </p>
          <ArtistMetaInfo countLabel={String(artist.reviewCount)} regionName={artist.regionName} className="mt-1.5" />
        </div>
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-muted">
          <Image
            src={artist.profileImage ?? artist.portfolioImage ?? "/icons/avatar.webp"}
            alt={artist.title}
            fill
            sizes="80px"
            quality={70}
            className="object-cover"
            priority={priority}
          />
        </div>
      </div>

      {/* Bottom: 3 portfolio thumbnails */}
      <PortfolioPreviewGrid images={artist.portfolioImages} artistName={artist.title} priority={priority} />
    </Link>
  );
}
