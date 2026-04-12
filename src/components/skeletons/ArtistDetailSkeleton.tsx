import { Skeleton } from "@/components/ui/skeleton";

/* eslint-disable max-lines-per-function */
export default function ArtistDetailSkeleton(): React.ReactElement {
  return (
    <main className="mx-auto w-full max-w-[767px] pb-20 md:pb-0">
      {/* Top Bar Skeleton */}
      <div className="sticky top-0 z-40 flex h-12 items-center justify-between border-b bg-background px-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Hero Carousel Skeleton */}
      <Skeleton className="aspect-[4/3] w-full" />

      {/* Artist Info Section */}
      <div className="bg-muted/50">
        <div className="px-4 pb-4 pt-3">
          {/* Profile Row */}
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <Skeleton className="h-14 w-14 shrink-0 rounded-full" />

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-6" />
              </div>

              {/* Location & Stats */}
              <div className="mt-2 flex items-center gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-4 w-10" />
              </div>
            </div>
          </div>
        </div>

        {/* Introduction Skeleton */}
        <div className="border-y border-border/50 bg-background px-4 py-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
          <Skeleton className="mt-3 h-4 w-16" />
        </div>

        {/* Chat Button Skeleton */}
        <div className="px-4 pb-4 pt-4">
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="border-b">
        <div className="flex">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </div>

      {/* Portfolio Grid Skeleton */}
      <div className="grid grid-cols-3 gap-1 p-1">
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={`skeleton-${i.toString()}`} className="aspect-square w-full" />
        ))}
      </div>
    </main>
  );
}
