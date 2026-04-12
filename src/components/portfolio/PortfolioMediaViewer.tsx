// @client-reason: useState for slider state, touch events for swipe
"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MediaItem {
  type: "image" | "video";
  url: string;
}

interface PortfolioMediaViewerProps {
  media: MediaItem[];
  altTitle: string;
  /** First image URL already rendered server-side for LCP — skip re-rendering at index 0 */
  firstImageUrl?: string;
}

function MediaNavButtons({ onPrevious, onNext, currentIndex, total }: Readonly<{
  onPrevious: () => void; onNext: () => void; currentIndex: number; total: number;
}>): React.ReactElement | null {
  if (total <= 1) return null;
  return (
    <>
      <button
        type="button"
        onClick={onPrevious}
        className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label="이전 이미지"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onNext}
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label="다음 이미지"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
      <div className="absolute bottom-4 right-4 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
        {currentIndex + 1} / {total}
      </div>
    </>
  );
}

function MediaContent({ item, index, altTitle, firstImageUrl }: Readonly<{
  item: MediaItem; index: number; altTitle: string; firstImageUrl?: string;
}>): React.ReactElement {
  if (item.type === "video") {
    return (
      <video src={item.url} controls playsInline className="h-full w-full object-cover">
        <track kind="captions" srcLang="ko" label="Korean captions" default />
      </video>
    );
  }
  if (index === 0 && firstImageUrl) {
    return <div className="h-full w-full" />;
  }
  return (
    <Image
      src={item.url}
      alt={`${altTitle} - ${index + 1}`}
      fill
      sizes="(max-width: 767px) 100vw, 767px"
      className="object-cover"
      loading="lazy"
    />
  );
}

export function PortfolioMediaViewer({
  media,
  altTitle,
  firstImageUrl,
}: Readonly<PortfolioMediaViewerProps>): React.ReactElement {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handlePrevious = useCallback((): void => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1));
  }, [media.length]);

  const handleNext = useCallback((): void => {
    setCurrentIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0));
  }, [media.length]);

  const handleTouchStart = useCallback((e: React.TouchEvent): void => {
    touchStartX.current = e.touches[0]?.clientX ?? 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent): void => {
    touchEndX.current = e.touches[0]?.clientX ?? 0;
  }, []);

  const handleTouchEnd = useCallback((): void => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (Math.abs(diff) > threshold) {
      if (diff > 0) handleNext();
      else handlePrevious();
    }
  }, [handleNext, handlePrevious]);

  const currentItem = media[currentIndex]; // eslint-disable-line security/detect-object-injection

  if (!currentItem) return <div className="aspect-square bg-muted" />;

  return (
    <div
      className={firstImageUrl ? "absolute inset-0" : "relative w-full overflow-hidden"}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={`relative aspect-square w-full ${currentIndex === 0 && firstImageUrl ? "bg-transparent" : "bg-black"}`}>
        <MediaContent item={currentItem} index={currentIndex} altTitle={altTitle} firstImageUrl={firstImageUrl} />
        <MediaNavButtons onPrevious={handlePrevious} onNext={handleNext} currentIndex={currentIndex} total={media.length} />
      </div>
    </div>
  );
}
