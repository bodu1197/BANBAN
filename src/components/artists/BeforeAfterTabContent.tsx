// @client-reason: No client state, but used within client tab component
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
      {/* Title if exists */}
      {photo.title && (
        <div className="px-3 pt-2 pb-1">
          <p className="text-sm font-medium text-foreground">{photo.title}</p>
        </div>
      )}

      {/* Side-by-side comparison */}
      <div className="relative flex">
        {/* Before Image */}
        <div className="relative aspect-square flex-1">
          {beforeUrl ? (
            <Image
              src={beforeUrl}
              alt={beforeLabel}
              fill
              className="object-cover"
              sizes="(max-width: 767px) 50vw, 384px"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full bg-muted" />
          )}
          {/* Before label badge */}
          <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {beforeLabel}
          </span>
        </div>

        {/* Center arrow divider */}
        <div className="absolute top-1/2 left-1/2 z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md">
          <ChevronRight className="h-4 w-4 text-gray-600" />
        </div>

        {/* After Image */}
        <div className="relative aspect-square flex-1">
          {afterUrl ? (
            <Image
              src={afterUrl}
              alt={afterLabel}
              fill
              className="object-cover"
              sizes="(max-width: 767px) 50vw, 384px"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full bg-muted" />
          )}
          {/* After label badge */}
          <span className="absolute right-2 bottom-2 rounded-md bg-brand-primary/80 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {afterLabel}
          </span>
        </div>
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
        <div className="flex flex-col gap-4">
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
