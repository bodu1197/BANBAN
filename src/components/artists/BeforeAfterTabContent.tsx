// @client-reason: Rendered inside client-parent ArtistDetailTabs (tab state management)
"use client";

import Image from "next/image";
import { ChevronRight } from "lucide-react";
import type { BeforeAfterPhoto } from "@/lib/supabase/queries";
import { getStorageUrl } from "@/lib/supabase/storage-utils";

interface BeforeAfterTabContentProps {
  photos: BeforeAfterPhoto[];
  totalCountLabel: string;
  emptyMessage: string;
  beforeLabel: string;
  afterLabel: string;
}

function ComparisonImage({ url, label, position }: Readonly<{
  url: string | null; label: string; position: "before" | "after";
}>): React.ReactElement {
  const isAfter = position === "after";
  return (
    <div className="relative aspect-square flex-1">
      {url ? (
        <Image
          src={url}
          alt={label}
          fill
          className="object-cover"
          sizes="(max-width: 767px) 50vw, (max-width: 1023px) 25vw, 192px"
          loading="lazy"
        />
      ) : (
        <div className="h-full w-full bg-muted" />
      )}
      <span className={`absolute ${isAfter ? "right-2 bottom-2 bg-brand-primary/80" : "bottom-2 left-2 bg-black/60"} rounded-md px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm md:px-2.5 md:py-1`}>
        {label}
      </span>
    </div>
  );
}

function BeforeAfterCard({
  photo,
  beforeLabel,
  afterLabel,
}: Readonly<{
  photo: BeforeAfterPhoto;
  beforeLabel: string;
  afterLabel: string;
}>): React.ReactElement {
  const beforeUrl = getStorageUrl(photo.before_image_path);
  const afterUrl = getStorageUrl(photo.after_image_path);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {photo.title && (
        <div className="px-3 pt-2 pb-1">
          <p className="text-sm font-medium text-foreground">{photo.title}</p>
        </div>
      )}
      <div className="relative flex">
        <ComparisonImage url={beforeUrl} label={beforeLabel} position="before" />
        <div className="absolute top-1/2 left-1/2 z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md md:h-8 md:w-8">
          <ChevronRight className="h-3.5 w-3.5 text-gray-600 md:h-4 md:w-4" />
        </div>
        <ComparisonImage url={afterUrl} label={afterLabel} position="after" />
      </div>
    </div>
  );
}

export function BeforeAfterTabContent({
  photos,
  totalCountLabel,
  emptyMessage,
  beforeLabel,
  afterLabel,
}: Readonly<BeforeAfterTabContentProps>): React.ReactElement {
  return (
    <div>
      {/* Header with count */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{totalCountLabel}</p>
      </div>

      {/* Photo list */}
      {photos.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-5">
          {photos.map((photo) => (
            <BeforeAfterCard
              key={photo.id}
              photo={photo}
              beforeLabel={beforeLabel}
              afterLabel={afterLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
