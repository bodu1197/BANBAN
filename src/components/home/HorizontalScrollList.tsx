// @client-reason: useRef + mouse event handlers for PC drag-to-scroll
"use client";

import { useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface HorizontalScrollListProps {
  children: React.ReactNode;
  className?: string;
}


// eslint-disable-next-line max-lines-per-function -- handlers for drag-to-scroll require local refs
export function HorizontalScrollList({
  children,
  className = "",
}: Readonly<HorizontalScrollListProps>): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const startX = useRef(0);
  const scrollStart = useRef(0);
  const pendingScroll = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    hasDragged.current = false;
    startX.current = e.pageX;
    scrollStart.current = containerRef.current?.scrollLeft ?? 0;
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.pageX - startX.current;
    if (Math.abs(dx) > 3) hasDragged.current = true;
    pendingScroll.current = scrollStart.current - dx;
    // Batch scrollLeft writes via rAF to avoid forced reflow on every mousemove
    if (rafId.current === null) {
      rafId.current = globalThis.requestAnimationFrame(() => {
        rafId.current = null;
        if (containerRef.current && pendingScroll.current !== null) {
          containerRef.current.scrollLeft = pendingScroll.current;
        }
      });
    }
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    if (rafId.current !== null) {
      globalThis.cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, []);

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (hasDragged.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return (
    <section
      ref={containerRef}
      aria-label="Horizontally scrollable content"
      className={cn("cursor-grab overflow-x-auto snap-x scroll-pl-4 whitespace-nowrap pl-4 mr-4 scrollbar-hide select-none active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onClickCapture={onClickCapture}
    >
      {children}
    </section>
  );
}
