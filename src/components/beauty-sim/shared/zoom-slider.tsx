// @client-reason: Pointer drag interaction for zoom control
"use client";

import { useRef, useCallback } from "react";
import { ZoomIn } from "lucide-react";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const TRACK_CLASS = "h-1.5 flex-1 rounded-full bg-white/20";
const FILL_CLASS = "h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 transition-none";
const THUMB_CLASS = "absolute -top-1.5 h-4.5 w-4.5 rounded-full bg-white shadow-md";

export function ZoomSlider({ zoom, onZoomChange }: Readonly<{
    zoom: number;
    onZoomChange: (zoom: number) => void;
}>): React.ReactElement {
    const trackRef = useRef<HTMLDivElement>(null);
    const dragging = useRef(false);

    const updateZoom = useCallback((clientX: number) => {
        const track = trackRef.current;
        if (!track) return;
        const rect = track.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        onZoomChange(MIN_ZOOM + ratio * (MAX_ZOOM - MIN_ZOOM));
    }, [onZoomChange]);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        dragging.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        updateZoom(e.clientX);
    }, [updateZoom]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!dragging.current) return;
        updateZoom(e.clientX);
    }, [updateZoom]);

    const handlePointerUp = useCallback(() => {
        dragging.current = false;
    }, []);

    const percent = Math.min(100, Math.max(0, ((zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100));

    return (
        <div className="flex items-center gap-2.5 px-2 py-1.5">
            <ZoomIn className="h-4 w-4 shrink-0 text-white/60" aria-hidden="true" />
            <div
                ref={trackRef}
                className={`relative ${TRACK_CLASS} touch-none`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                role="slider"
                aria-label="확대/축소"
                aria-valuemin={MIN_ZOOM * 100}
                aria-valuemax={MAX_ZOOM * 100}
                aria-valuenow={Math.round(zoom * 100)}
            >
                <div className={FILL_CLASS} style={{ width: `${percent}%` }} />
                <div className={THUMB_CLASS} style={{ left: `calc(${percent}% - 9px)` }} />
            </div>
            <span className="w-8 text-right text-[10px] font-medium text-white/60">{zoom.toFixed(1)}x</span>
        </div>
    );
}
