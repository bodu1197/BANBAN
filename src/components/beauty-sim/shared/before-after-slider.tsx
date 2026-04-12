// @client-reason: Pointer events for draggable comparison slider overlay
"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ─── Subcomponents ──────────────────────────────────────────────────────────

function SliderHandle({ position }: Readonly<{ position: number }>): React.ReactElement {
    return (
        <div
            className="absolute top-0 bottom-0 z-10 w-0.5 bg-white shadow-lg"
            style={{ left: `${String(position)}%` }}
        >
            <div className="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-white/80 shadow-lg backdrop-blur-sm">
                <svg viewBox="0 0 16 16" className="h-4 w-4 text-foreground">
                    <path d="M5 3L2 8L5 13M11 3L14 8L11 13" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        </div>
    );
}

function SliderLabels(): React.ReactElement {
    return (
        <>
            <span className="absolute top-2 left-2 z-10 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white">Before</span>
            <span className="absolute top-2 right-2 z-10 rounded-full bg-pink-500/80 px-2 py-0.5 text-xs font-medium text-white">After</span>
        </>
    );
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

function useContainerWidth(containerRef: React.RefObject<HTMLDivElement | null>): number {
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) setContainerWidth(entry.contentRect.width);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [containerRef]);

    return containerWidth;
}

function useSliderPointer(containerRef: React.RefObject<HTMLDivElement | null>): {
    position: number;
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: () => void;
} {
    const [position, setPosition] = useState(50);
    const isDragging = useRef(false);

    const updatePosition = useCallback((clientX: number) => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const x = clientX - rect.left;
        setPosition(Math.max(0, Math.min(100, (x / rect.width) * 100)));
    }, [containerRef]);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        isDragging.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        updatePosition(e.clientX);
    }, [updatePosition]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging.current) return;
        updatePosition(e.clientX);
    }, [updatePosition]);

    const onPointerUp = useCallback(() => {
        isDragging.current = false;
    }, []);

    return { position, onPointerDown, onPointerMove, onPointerUp };
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function BeforeAfterSlider({ beforeSrc, afterSrc }: Readonly<{
    beforeSrc: string;
    afterSrc: string;
}>): React.ReactElement {
    const containerRef = useRef<HTMLDivElement>(null);
    const containerWidth = useContainerWidth(containerRef);
    const { position, onPointerDown, onPointerMove, onPointerUp } = useSliderPointer(containerRef);

    return (
        <div
            ref={containerRef}
            className="relative aspect-square w-full select-none overflow-hidden rounded-xl border"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            aria-label="비포/애프터 비교 슬라이더"
            role="slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(position)}
        >
            {/* After image (full) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={afterSrc} alt="시뮬레이션 결과" className="absolute inset-0 h-full w-full object-cover" draggable={false} />

            {/* Before image (clipped) */}
            <div className="absolute inset-0 overflow-hidden" style={{ width: `${String(position)}%` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={beforeSrc}
                    alt="원본"
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ width: `${String(containerWidth)}px` }}
                    draggable={false}
                />
            </div>

            <SliderHandle position={position} />
            <SliderLabels />
        </div>
    );
}
