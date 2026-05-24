// @client-reason: URL-synced filters, region selector, nearby (geolocation)
"use client";

import { useCallback, useMemo, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, MapPin, Navigation } from "lucide-react";
import { STRINGS } from "@/lib/strings";
import { useEventSearch } from "@/hooks/useEventSearch";
import { useNearbyEvents } from "@/hooks/useNearbyEvents";
import { useGeolocation } from "@/hooks/useGeolocation";
import { EventCard } from "@/components/event/EventCard";
import { RegionSelector } from "@/components/filters/RegionSelector";
import type { Region } from "@/types/database";
import type { EventCardData } from "@/lib/supabase/event-queries";

interface EventsSearchClientProps {
  initialEvents: EventCardData[];
  initialTotalCount: number;
  regions: Region[];
}

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

function EventGridSkeleton(): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={`skel-${String(i)}`} className="aspect-square animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

function EventContent({ events, isLoading, isLoadingMore, noDataLabel }: Readonly<{
  events: EventCardData[];
  isLoading: boolean;
  isLoadingMore: boolean;
  noDataLabel: string;
}>): React.ReactElement {
  if (isLoading) return <EventGridSkeleton />;

  return (
    <>
      {events.length === 0 && (
        <div role="status" aria-live="polite" className="flex min-h-[200px] items-center justify-center">
          <p className="text-muted-foreground">{noDataLabel}</p>
        </div>
      )}
      {events.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
      {isLoadingMore && (
        <div className="flex items-center justify-center py-6">
          <div className="h-6 w-6 motion-safe:animate-spin rounded-full border-2 border-muted-foreground border-t-brand-primary" />
        </div>
      )}
    </>
  );
}

type GeoStatus = "idle" | "loading" | "success" | "denied" | "error";

function GeoStatusBanner({ geoStatus, hasFilters, isNearbyMode, totalCount, onRequestNearby }: Readonly<{
  geoStatus: GeoStatus;
  hasFilters: boolean;
  isNearbyMode: boolean;
  totalCount: number;
  onRequestNearby: () => void;
}>): React.ReactElement | null {
  if (isNearbyMode) {
    return (
      <div role="status" aria-live="polite" className="mb-3 flex items-center gap-2 rounded-lg bg-brand-primary/10 px-3 py-2 text-sm text-brand-primary">
        <Navigation className="h-4 w-4" aria-hidden="true" />
        <span>내 주변 {totalCount}개의 이벤트 (거리순)</span>
      </div>
    );
  }

  if (geoStatus === "idle" && !hasFilters) {
    return (
      <button
        type="button"
        onClick={onRequestNearby}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-brand-primary/30 bg-brand-primary/5 px-3 py-2.5 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="내주변 이벤트찾기"
      >
        <Navigation className="h-4 w-4" aria-hidden="true" />
        <span>내주변 이벤트찾기</span>
      </button>
    );
  }

  if (geoStatus === "denied" && !hasFilters) {
    return (
      <div role="status" aria-live="polite" className="mb-3 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4" aria-hidden="true" />
        <span>위치 권한이 거부되었습니다. 지역 필터를 사용해주세요.</span>
      </div>
    );
  }

  if (geoStatus === "loading") {
    return (
      <div role="status" aria-live="polite" className="mb-3 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
        <div className="h-4 w-4 motion-safe:animate-spin rounded-full border-2 border-muted-foreground border-t-brand-primary" aria-hidden="true" />
        <span>위치를 확인하고 있습니다...</span>
      </div>
    );
  }

  return null;
}

function useResolvedEvents(
  searchEvents: EventCardData[],
  searchLoading: boolean,
  isLoadingMore: boolean,
  initialTotalCount: number,
  nearby: { events: EventCardData[]; isLoading: boolean; totalCount: number },
  isNearbyMode: boolean,
): { events: EventCardData[]; isLoading: boolean; isLoadingMore: boolean; totalCount: number; noDataLabel: string } {
  if (isNearbyMode) {
    return {
      events: nearby.events,
      isLoading: nearby.isLoading,
      isLoadingMore: false,
      totalCount: nearby.totalCount,
      noDataLabel: "주변에 등록된 이벤트가 없습니다",
    };
  }
  return {
    events: searchEvents,
    isLoading: searchLoading,
    isLoadingMore,
    totalCount: searchEvents.length || initialTotalCount,
    noDataLabel: "등록된 이벤트가 없습니다",
  };
}

function PageHeader({ onBack }: Readonly<{ onBack: () => void }>): React.ReactElement {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <button
        type="button"
        onClick={onBack}
        aria-label="뒤로 가기"
        className="flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h1 className="text-base font-bold">이벤트</h1>
    </header>
  );
}

/* eslint-disable max-lines-per-function */
function EventsSearchInner({
  initialEvents,
  initialTotalCount,
  regions,
}: Readonly<EventsSearchClientProps>): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { events: searchEvents, isLoading: searchLoading, isLoadingMore, sentinelRef, regionId, regionSido } =
    useEventSearch(initialEvents, initialTotalCount);

  const geo = useGeolocation();
  const nearby = useNearbyEvents(
    geo.position?.latitude ?? null,
    geo.position?.longitude ?? null,
  );

  const hasFilters = Boolean(regionId || regionSido);
  const isNearbyMode = geo.status === "success" && !hasFilters;

  const resolved = useResolvedEvents(searchEvents, searchLoading, isLoadingMore, initialTotalCount, nearby, isNearbyMode);

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

  const handleBack = useCallback((): void => {
    if (typeof globalThis !== "undefined" && globalThis.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }, [router]);

  const regionLabels = useMemo(() => ({
    regionView: d.portfolioSearch.regionView,
    allRegions: d.portfolioSearch.allRegions,
    resetAll: d.portfolioSearch.resetAll,
    back: d.portfolioSearch.back,
    close: d.portfolioSearch.close,
    resetRegion: d.portfolioSearch.resetRegion,
  }), [d]);

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader onBack={handleBack} />

      <RegionSelector
        regions={regions}
        selectedId={regionId}
        selectedSido={regionSido}
        labels={regionLabels}
        onSelectRegions={handleRegionsSelect}
      />

      <section className="px-4 py-2">
        <GeoStatusBanner
          geoStatus={geo.status}
          hasFilters={hasFilters}
          isNearbyMode={isNearbyMode}
          totalCount={resolved.totalCount}
          onRequestNearby={geo.request}
        />

        <div className="mb-4 h-px bg-border" />

        <EventContent
          events={resolved.events}
          isLoading={resolved.isLoading}
          isLoadingMore={resolved.isLoadingMore}
          noDataLabel={resolved.noDataLabel}
        />
        {!isNearbyMode && <div ref={sentinelRef} className="h-1" />}
      </section>
    </div>
  );
}

export function EventsSearchClient(
  props: Readonly<EventsSearchClientProps>,
): React.ReactElement {
  return (
    <Suspense fallback={<EventGridSkeleton />}>
      <EventsSearchInner {...props} />
    </Suspense>
  );
}
