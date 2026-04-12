import { IconWithLabel } from "./IconWithLabel";
import { RegionBadge } from "./RegionBadge";

interface ArtistMetaInfoProps {
  countLabel: string;
  regionName: string | null;
  className?: string;
  inline?: boolean;
  distanceAlt?: string;
  reviewsAlt?: string;
}

export function ArtistMetaInfo({
  countLabel,
  regionName,
  className = "",
  inline = false,
  distanceAlt = "Distance",
  reviewsAlt = "Reviews",
}: Readonly<ArtistMetaInfoProps>): React.ReactElement {
  const icons = (
    <div className="flex items-center gap-2.5">
      <IconWithLabel icon="/icons/icon_distance.svg" label="-" alt={distanceAlt} />
      <IconWithLabel icon="/icons/icon_comment.svg" label={countLabel} alt={reviewsAlt} />
    </div>
  );

  if (inline) {
    return (
      <div className={`flex items-center justify-between ${className}`}>
        {icons}
        {regionName && <RegionBadge name={regionName} />}
      </div>
    );
  }

  return (
    <div className={className}>
      {icons}
      {regionName && (
        <div className="mt-1.5">
          <RegionBadge name={regionName} />
        </div>
      )}
    </div>
  );
}
