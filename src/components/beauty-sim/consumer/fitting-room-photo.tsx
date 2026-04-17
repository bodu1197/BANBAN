// @client-reason: Canvas rendering, pointer events for drag interaction, pinch zoom/pan, magnifier overlay
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MagnifyingGlass } from "@/components/beauty-sim/shared/magnifying-glass";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

function dist(ax: number, ay: number, bx: number, by: number): number {
    return Math.hypot(ax - bx, ay - by);
}

function clampPan(x: number, y: number, zoom: number, w: number, h: number): { x: number; y: number } {
    const maxX = Math.max(0, (w * (zoom - 1)) / 2);
    const maxY = Math.max(0, (h * (zoom - 1)) / 2);
    return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y)),
    };
}

interface PinchInitial {
    distance: number;
    midX: number;
    midY: number;
    zoom: number;
    panX: number;
    panY: number;
}

interface PhotoAreaProps {
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
    setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
    pan: { x: number; y: number };
    setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
}

/** Photo canvas with 2-finger pinch zoom + pan; 1-finger falls through to eyebrow drag. */
// eslint-disable-next-line max-lines-per-function -- Photo viewport: pointer multi-touch + rendering
export function PhotoArea({
    canvasRef, imageDataUrl, isComparing,
    onDragStart, onDragMove, onDragEnd,
    isDragging, dragPointer, dragSide, containerRef,
    zoomed, zoomLevel, setZoomLevel, pan, setPan,
}: Readonly<PhotoAreaProps>): React.ReactElement {
    const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        if (isDragging && containerRef.current) {
            setContainerRect(containerRef.current.getBoundingClientRect());
        }
    }, [isDragging, containerRef]);

    // Re-clamp pan whenever zoom level shrinks (e.g. via slider) so image stays in view
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        setPan((prev) => clampPan(prev.x, prev.y, zoomLevel, rect.width, rect.height));
    }, [zoomLevel, containerRef, setPan]);

    // Multi-pointer tracking for pinch/pan
    const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
    const pinchInitial = useRef<PinchInitial | null>(null);
    const wasMultiTouch = useRef(false);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        const count = pointers.current.size;
        if (count === 1) {
            wasMultiTouch.current = false;
            onDragStart(e);
            return;
        }
        if (count === 2) {
            wasMultiTouch.current = true;
            const pts = Array.from(pointers.current.values());
            const p1 = pts.at(0);
            const p2 = pts.at(1);
            if (p1 && p2) {
                pinchInitial.current = {
                    distance: dist(p1.x, p1.y, p2.x, p2.y),
                    midX: (p1.x + p2.x) / 2,
                    midY: (p1.y + p2.y) / 2,
                    zoom: zoomLevel,
                    panX: pan.x,
                    panY: pan.y,
                };
            }
        }
    }, [onDragStart, zoomLevel, pan]);

    const applyPinch = useCallback((p1: { x: number; y: number }, p2: { x: number; y: number }) => {
        const init = pinchInitial.current;
        if (!init) return;
        const curDist = dist(p1.x, p1.y, p2.x, p2.y);
        const scale = init.distance > 0 ? curDist / init.distance : 1;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, init.zoom * scale));
        const curMidX = (p1.x + p2.x) / 2;
        const curMidY = (p1.y + p2.y) / 2;
        const dx = curMidX - init.midX;
        const dy = curMidY - init.midY;
        const rect = containerRef.current?.getBoundingClientRect();
        const w = rect?.width ?? 0;
        const h = rect?.height ?? 0;
        setZoomLevel(newZoom);
        setPan(clampPan(init.panX + dx, init.panY + dy, newZoom, w, h));
    }, [containerRef, setZoomLevel, setPan]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!pointers.current.has(e.pointerId)) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const count = pointers.current.size;
        if (count >= 2 && pinchInitial.current) {
            const pts = Array.from(pointers.current.values());
            const p1 = pts.at(0);
            const p2 = pts.at(1);
            if (p1 && p2) applyPinch(p1, p2);
            return;
        }
        if (count === 1 && !wasMultiTouch.current) {
            onDragMove(e);
        }
    }, [onDragMove, applyPinch]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        pointers.current.delete(e.pointerId);
        const count = pointers.current.size;
        if (count < 2) pinchInitial.current = null;
        if (count === 0) {
            onDragEnd(e);
            wasMultiTouch.current = false;
        }
    }, [onDragEnd]);

    const effectiveZoom = zoomed ? Math.max(zoomLevel, 1.25) : zoomLevel;
    const cursorClass = effectiveZoom > 1 ? "cursor-grab" : "cursor-move";

    return (
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
            <div
                ref={containerRef}
                className={`relative max-h-full w-full max-w-sm select-none overflow-hidden rounded-3xl bg-gray-100 shadow-2xl touch-none transition-transform duration-300 origin-center ${cursorClass}`}
                style={{ transform: `translate(${String(pan.x)}px, ${String(pan.y)}px) scale(${String(effectiveZoom)})` }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
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
