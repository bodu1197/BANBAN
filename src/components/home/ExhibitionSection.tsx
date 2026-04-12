import Link from "next/link";

import { getStorageUrl, getAvatarUrl } from "@/lib/supabase/storage-utils";
import { SectionHeader } from "./SectionHeader";
import { HorizontalScrollList } from "./HorizontalScrollList";
import { SquareImage } from "./SquareImage";
import { PriceDisplay } from "./PriceDisplay";
import { UserAvatar } from "./UserAvatar";
import type { ExhibitionEntryWithDetails } from "@/lib/supabase/exhibition-entry-queries";

function ExhibitionEntryCard({ entry, priority }: Readonly<{
  entry: ExhibitionEntryWithDetails;
  priority?: boolean;
}>): React.ReactElement {
  const { portfolio, artist } = entry;
  const imageUrl = getStorageUrl(portfolio.thumbnail_path);
  const avatarUrl = getAvatarUrl(artist.profile_image_path);

  return (
    <Link
      href={`/portfolios/${portfolio.id}`}
      className="group inline-block w-[140px] whitespace-normal mr-3 rounded-lg align-top focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <SquareImage src={imageUrl} alt={portfolio.title} sizes="140px" priority={priority} />
      <div className="mt-1.5 space-y-1">
        <UserAvatar name={artist.title} imageSrc={avatarUrl} />
        <p className="truncate text-xs font-medium transition-colors group-hover:text-brand-primary group-focus-visible:text-brand-primary">
          {portfolio.title}
        </p>
        <PriceDisplay
          price={portfolio.price}
          priceOrigin={portfolio.price_origin}
          discountRate={portfolio.discount_rate}
        />
      </div>
    </Link>
  );
}

export function ExhibitionSection({ entries, title, moreLink, moreText }: Readonly<{
  entries: ExhibitionEntryWithDetails[];
  title: string;
  moreLink: string;
  moreText?: string;
}>): React.ReactElement | null {
  if (entries.length === 0) return null;
  return (
    <section className="py-4">
      <SectionHeader
        title={title}
        moreLink={moreLink}
        moreText={moreText}

      />
      <HorizontalScrollList>
        {entries.map((entry, i) => (
          <ExhibitionEntryCard key={entry.id} entry={entry} priority={i === 0} />
        ))}
      </HorizontalScrollList>
    </section>
  );
}
