// @client-reason: URL-synced filters, category tabs, like toggle for artist search
"use client";

import { useState, useCallback, useMemo, Suspense, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { STRINGS } from "@/lib/strings";
import { useArtistSearch } from "@/hooks/useArtistSearch";
import { toggleLike } from "@/lib/actions/likes";
import { ArtistListCard } from "./ArtistListCard";
import { RegionSelector } from "@/components/filters/RegionSelector";
import type { Region } from "@/types/database";
import type { ArtistListItem } from "@/lib/supabase/artist-queries";

interface ArtistSearchClientProps {
  initialArtists: ArtistListItem[];
  initialTotalCount: number;
  regions: Region[];
  initialLikedIds?: string[];
}

// --- Helpers ---

function buildUpdatedPath(pathname: string, current: URLSearchParams, updates: Partial<Record<string, string | null>>): string {
  const params = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === "" || value === undefined) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

// --- Skeleton ---

function ArtistSkeleton(): React.ReactElement {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={`skel-${String(i)}`} className="animate-pulse border-b border-border py-4">
          <div className="mb-3 flex items-start gap-3">
            <div className="h-12 w-12 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <div className="aspect-square rounded-lg bg-muted" />
            <div className="aspect-square rounded-lg bg-muted" />
            <div className="aspect-square rounded-lg bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Artist content area ---

function ArtistContent({ artists, isLoading, isLoadingMore, noDataLabel, likedIds, onLikeToggle }: Readonly<{
  artists: ArtistListItem[]; isLoading: boolean; isLoadingMore: boolean; noDataLabel: string;
  likedIds: Set<string>; onLikeToggle: (id: string) => void;
}>): React.ReactElement {
  if (isLoading) return <ArtistSkeleton />;

  return (
    <>
      {artists.length === 0 && (
        <div className="flex min-h-[200px] items-center justify-center">
          <p className="text-muted-foreground">{noDataLabel}</p>
        </div>
      )}
      {artists.length > 0 && (
        <div>
          {artists.map((artist) => (
            <ArtistListCard
              key={artist.id}
              id={artist.id}
              name={artist.name}
              profileImage={artist.profileImage}
              portfolioImages={artist.portfolioImages}
              region={artist.region}
              address={artist.address}
              rating={artist.rating}
              reviewCount={artist.reviewCount}
              likesCount={artist.likesCount}
              isLiked={likedIds.has(artist.id)}
              onLikeToggle={onLikeToggle}
            />
          ))}
        </div>
      )}
      {isLoadingMore && (
        <div className="flex items-center justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-brand-primary" />
        </div>
      )}
    </>
  );
}

// --- Inner component ---

/* eslint-disable max-lines-per-function */
function ArtistSearchInner({ initialArtists,
  initialTotalCount,
  regions,
  initialLikedIds = [],
}: Readonly<ArtistSearchClientProps>): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const { artists, isLoading, isLoadingMore, sentinelRef, regionId, regionSido } =
    useArtistSearch(initialArtists, initialTotalCount);

  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set(initialLikedIds));

  const d = STRINGS;

  const navigateWithParams = useCallback(
    (updates: Partial<Record<string, string | null>>): void => {
      router.push(buildUpdatedPath(pathname, searchParams, updates));
    },
    [pathname, router, searchParams],
  );

  const handleRegionsSelect = useCallback((id: string | null, sido: string | null): void => {
    navigateWithParams({ region: id, regionSido: sido });
  }, [navigateWithParams]);

  const handleLikeToggle = useCallback((artistId: string): void => {
    // Optimistic update
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(artistId)) next.delete(artistId);
      else next.add(artistId);
      return next;
    });

    // Server action with revert on failure
    startTransition(async () => {
      const result = await toggleLike(artistId).catch(() => null);
      if (!result?.success) {
        setLikedIds((prev) => {
          const reverted = new Set(prev);
          if (reverted.has(artistId)) reverted.delete(artistId);
          else reverted.add(artistId);
          return reverted;
        });
      }
    });
  }, []);

  const regionLabels = useMemo(() => ({
    regionView: d.portfolioSearch.regionView,
    allRegions: d.portfolioSearch.allRegions,
    resetAll: d.portfolioSearch.resetAll,
    back: d.portfolioSearch.back,
    close: d.portfolioSearch.close,
    resetRegion: d.portfolioSearch.resetRegion,
  }), [d]);

  return (
    <div className="mx-auto w-full max-w-[767px]">
      {/* Region Selector */}
      <RegionSelector
        regions={regions}
        selectedId={regionId}
        selectedSido={regionSido}
        labels={regionLabels}
        onSelectRegions={handleRegionsSelect}
      />

      <section className="px-4 py-2">
        <div className="mb-4 h-px bg-border" />

        {/* Artist List */}
        <ArtistContent
          artists={artists}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          noDataLabel={d.common.noData}
          likedIds={likedIds}
          onLikeToggle={handleLikeToggle}
        />
        <div ref={sentinelRef} className="h-1" />
      </section>
    </div>
  );
}

export function ArtistSearchClient(
  props: Readonly<ArtistSearchClientProps>,
): React.ReactElement {
  return (
    <Suspense fallback={<ArtistSkeleton />}>
      <ArtistSearchInner {...props} />
    </Suspense>
  );
}
