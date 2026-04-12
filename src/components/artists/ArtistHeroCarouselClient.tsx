// @client-reason: Uses useState for slide index, useRef for scroll container, IntersectionObserver for tracking
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

  const scrollToIndex = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    // Use scrollIntoView on the slide instead of reading offsetWidth — avoids forced reflow
    const slide = container.querySelector<HTMLElement>(`[data-index="${index}"]`);
    slide?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }, []);

  const goToPrevious = useCallback(() => {
    const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    scrollToIndex(newIndex);
  }, [currentIndex, images.length, scrollToIndex]);

  const goToNext = useCallback(() => {
    const newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
    scrollToIndex(newIndex);
  }, [currentIndex, images.length, scrollToIndex]);

  const observerCallback = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (!Number.isNaN(index)) {
            setCurrentIndex(index);
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

  if (images.length <= 1) {
    return <></>;
  }

  return (
    <div className="absolute inset-0">
      {/* Scrollable carousel overlay */}
      <div
        ref={scrollRef}
        className="flex h-full snap-x snap-mandatory overflow-x-auto scrollbar-hide"
      >
        {images.map((src, i) => (
          <div
            key={src}
            data-index={i}
            className="h-full w-full flex-none snap-center"
          >
            {/* First image is already rendered server-side, show transparent placeholder */}
            {i === 0 ? (
              <div className="h-full w-full" />
            ) : (
              <div className="relative h-full w-full">
                <Image
                  src={src}
                  alt={`${artistName} ${(i + 1).toString()}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 767px) 100vw, 767px"
                  loading="lazy"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        type="button"
        onClick={goToPrevious}
        className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label={previousImageLabel}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={goToNext}
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label={nextImageLabel}
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Slide Counter */}
      <div className="absolute right-3 bottom-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
}
