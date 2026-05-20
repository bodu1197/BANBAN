// @client-reason: Uses useState for slide index, useRef for scroll container, IntersectionObserver for tracking
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SLIDE_INTERVAL_MS = 4000;

/* eslint-disable max-lines-per-function */
interface ArtistHeroCarouselClientProps {
  images: string[];
  artistName: string;
  previousImageLabel?: string;
  nextImageLabel?: string;
}

export function ArtistHeroCarouselClient({
  images,
  artistName,
  previousImageLabel = "Previous image",
  nextImageLabel = "Next image",
}: Readonly<ArtistHeroCarouselClientProps>): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const pausedRef = useRef(false);

  const scrollToIndex = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const slide = container.querySelector<HTMLElement>(`[data-index="${index}"]`);
    const prefersReduced = typeof globalThis.matchMedia === "function"
      && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
    slide?.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      block: "nearest",
      inline: "start",
    });
  }, []);

  const goToPrevious = useCallback(() => {
    const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    scrollToIndex(newIndex);
  }, [currentIndex, images.length, scrollToIndex]);

  const goToNext = useCallback(() => {
    const newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
    scrollToIndex(newIndex);
  }, [currentIndex, images.length, scrollToIndex]);

  // Stable interval — reads currentIndexRef so no dependency on goToNext/currentIndex
  useEffect(() => {
    if (images.length <= 1) return;
    const prefersReduced = typeof globalThis.matchMedia === "function"
      && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const timer = globalThis.setInterval(() => {
      if (pausedRef.current) return;
      const next = currentIndexRef.current === images.length - 1 ? 0 : currentIndexRef.current + 1;
      scrollToIndex(next);
    }, SLIDE_INTERVAL_MS);
    return () => globalThis.clearInterval(timer);
  }, [images.length, scrollToIndex]);

  const observerCallback = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (!Number.isNaN(index)) {
            setCurrentIndex(index);
            currentIndexRef.current = index;
          }
        }
      }
    },
    [],
  );

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(observerCallback, {
      root: container,
      threshold: 0.5,
    });

    const slides = container.querySelectorAll("[data-index]");
    for (const slide of slides) {
      observer.observe(slide);
    }

    return () => observer.disconnect();
  }, [observerCallback, images.length]);

  const handlePause = useCallback(() => { pausedRef.current = true; }, []);
  const handleResume = useCallback(() => { pausedRef.current = false; }, []);

  if (images.length <= 1) {
    return <></>;
  }

  return (
    <div className="absolute inset-0">
      <div
        ref={scrollRef}
        className="flex h-full snap-x snap-mandatory overflow-x-auto scrollbar-hide"
        aria-live="polite"
        onMouseEnter={handlePause}
        onMouseLeave={handleResume}
        onTouchStart={handlePause}
        onTouchEnd={handleResume}
      >
        {images.map((src, i) => (
          <div
            key={src}
            data-index={i}
            className="h-full w-full flex-none snap-center"
          >
            {i === 0 ? (
              <div className="h-full w-full" />
            ) : (
              <div className="relative h-full w-full">
                <Image
                  src={src}
                  alt={`${artistName} ${(i + 1).toString()}`}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 1024px, 100vw"
                  loading="lazy"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={goToPrevious}
        className="absolute top-1/2 left-2 hidden -translate-y-1/2 rounded-full bg-black/50 p-2.5 text-white transition-colors hover:bg-black/70 focus-visible:bg-black/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:block"
        aria-label={previousImageLabel}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={goToNext}
        className="absolute top-1/2 right-2 hidden -translate-y-1/2 rounded-full bg-black/50 p-2.5 text-white transition-colors hover:bg-black/70 focus-visible:bg-black/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:block"
        aria-label={nextImageLabel}
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div
        className="absolute right-3 bottom-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white"
        aria-label={`이미지 ${(currentIndex + 1).toString()} / ${images.length.toString()}`}
      >
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
}
