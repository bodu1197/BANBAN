// @client-reason: URL-synced filters, category tabs, like toggle, geolocation for nearby artists
"use client";

import { useState, useCallback, useMemo, useEffect, Suspense, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { STRINGS } from "@/lib/strings";
import { useArtistSearch } from "@/hooks/useArtistSearch";
import { useNearbyArtists } from "@/hooks/useNearbyArtists";
import { useGeolocation } from "@/hooks/useGeolocation";
import { toggleLike } from "@/lib/actions/likes";
import { ArtistListCard } from "./ArtistListCard";
import { RegionSelector } from "@/components/filters/RegionSelector";
import { MapPin, Navigation } from "lucide-react";
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
              distance={artist.distanceKm}
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

  const { artists: searchArtists, isLoading: searchLoading, isLoadingMore, sentinelRef, regionId, regionSido } =
    useArtistSearch(initialArtists, initialTotalCount);

  const geo = useGeolocation();
  const nearby = useNearbyArtists(
    geo.position?.latitude ?? null,
    geo.position?.longitude ?? null,
  );

  const hasFilters = Boolean(regionId || regionSido || searchParams.get("q"));
  const isNearbyMode = geo.status === "success" && !hasFilters;

  const artists = isNearbyMode ? nearby.artists : searchArtists;
  const isLoading = isNearbyMode ? nearby.isLoading : searchLoading;
  const totalCount = isNearbyMode ? nearby.totalCount : (searchArtists.length || initialTotalCount);

  // 페이지 진입 시 자동으로 위치 요청 (1회)
  useEffect(() => {
    if (geo.status === "idle") {
      geo.request();
    }
  }, [geo]);

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
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(artistId)) next.delete(artistId);
      else next.add(artistId);
      return next;
    });

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
        {/* Nearby mode indicator */}
        {isNearbyMode && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-brand-primary/10 px-3 py-2 text-sm text-brand-primary">
            <Navigation className="h-4 w-4" />
            <span>내 주변 {totalCount}개의 샵 (거리순)</span>
          </div>
        )}

        {geo.status === "denied" && !hasFilters && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>위치 권한이 거부되었습니다. 지역 필터를 사용해주세요.</span>
          </div>
        )}

        {geo.status === "loading" && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-brand-primary" />
            <span>위치를 확인하고 있습니다...</span>
          </div>
        )}

        <div className="mb-4 h-px bg-border" />

        {/* Artist List */}
        <ArtistContent
          artists={artists}
          isLoading={isLoading}
          isLoadingMore={isNearbyMode ? false : isLoadingMore}
          noDataLabel={isNearbyMode ? "주변에 등록된 샵이 없습니다" : d.common.noData}
          likedIds={likedIds}
          onLikeToggle={handleLikeToggle}
        />
        {!isNearbyMode && <div ref={sentinelRef} className="h-1" />}
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
