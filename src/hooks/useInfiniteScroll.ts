// @client-reason: Custom hook using useEffect/useRef with IntersectionObserver browser API
"use client";

import { useCallback, useEffect, useRef } from "react";
import { INFINITE_SCROLL_THRESHOLD } from "@/lib/constants";

interface UseInfiniteScrollOptions {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  threshold?: number;
}

/**
 * Hook for infinite scroll functionality
 */
export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  threshold = INFINITE_SCROLL_THRESHOLD,
}: UseInfiniteScrollOptions): React.RefObject<HTMLDivElement | null> {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]): void => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !isLoading) {
        onLoadMore();
      }
    },
    [hasMore, isLoading, onLoadMore]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return undefined;

    observerRef.current = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin: "100px",
      threshold,
    });

    observerRef.current.observe(sentinel);

    return (): void => {
      /* c8 ignore start -- observerRef.current is always set after observe() */
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      /* c8 ignore stop */
    };
  }, [handleIntersect, threshold]);

  return sentinelRef;
}
