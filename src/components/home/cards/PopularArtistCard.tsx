import Link from "next/link";
import { SquareImage } from "../SquareImage";
import { RegionBadge } from "../RegionBadge";
import type { HomeArtist } from "@/lib/supabase/home-queries";

interface PopularArtistCardProps {
  artist: HomeArtist;
  priority?: boolean;
}

export function PopularArtistCard({
  artist,
  priority = false,
}: Readonly<PopularArtistCardProps>): React.ReactElement {
  return (
    <Link
      href={`/artists/${artist.id}`}
      className="group inline-block w-60 align-top whitespace-normal mr-[15px] snap-start rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <SquareImage
        src={artist.profileImage ?? artist.portfolioImage}
        alt={artist.title}
        sizes="240px"
        priority={priority}
      />
      <div className="mt-2.5">
        <p className="truncate text-base font-semibold transition-colors group-hover:text-brand-primary group-focus-visible:text-brand-primary">
          {artist.title}
        </p>
        {artist.introduce && (
          <p className="truncate text-sm text-muted-foreground">
            {artist.introduce}
          </p>
        )}
        {artist.regionName && (
          <div className="mt-1.5">
            <RegionBadge name={artist.regionName} />
          </div>
        )}
      </div>
    </Link>
  );
}
