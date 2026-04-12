// @client-reason: Canvas rendering, pointer events for drag interaction, magnifier overlay
"use client";

import { useState, useEffect } from "react";
import { MagnifyingGlass } from "@/components/beauty-sim/shared/magnifying-glass";

/** Photo canvas only — no buttons, no sliders. Fills available vertical space without clipping controls. */
export function PhotoArea({ canvasRef, imageDataUrl, isComparing, onDragStart, onDragMove, onDragEnd, isDragging, dragPointer, dragSide, containerRef, zoomed, zoomLevel }: Readonly<{
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    imageDataUrl: string;
    isComparing: boolean;
    onDragStart: (e: React.PointerEvent) => void;
    onDragMove: (e: React.PointerEvent) => void;
    onDragEnd: (e: React.PointerEvent) => void;
    isDragging: boolean;
    dragPointer: { x: number; y: number } | null;
    dragSide: "left" | "right";
    containerRef: React.RefObject<HTMLDivElement | null>;
    zoomed: boolean;
    zoomLevel: number;
}>): React.ReactElement {
    const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        if (isDragging && containerRef.current) {
            setContainerRect(containerRef.current.getBoundingClientRect());
        }
    }, [isDragging, containerRef]);

    return (
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
            <div
                ref={containerRef}
                className="relative max-h-full w-full max-w-sm cursor-move select-none overflow-hidden rounded-3xl bg-gray-100 shadow-2xl touch-none transition-transform duration-300 origin-center"
                style={{ transform: `scale(${zoomed ? Math.max(zoomLevel, 1.25) : zoomLevel})` }}
                onPointerDown={onDragStart}
                onPointerMove={onDragMove}
                onPointerUp={onDragEnd}
                onPointerCancel={onDragEnd}
            >
                <canvas ref={canvasRef} className="h-auto w-full" />
                {isComparing && (
                    /* eslint-disable-next-line @next/next/no-img-element -- Data URL, no optimization needed */
                    <img src={imageDataUrl} alt="원본" className="absolute inset-0 h-full w-full object-cover" />
                )}
            </div>
            {isDragging && dragPointer && (
                <MagnifyingGlass
                    canvasRef={canvasRef}
                    pointerX={dragPointer.x}
                    pointerY={dragPointer.y}
                    containerRect={containerRect}
                    side={dragSide}
                />
            )}
        </div>
    );
}
