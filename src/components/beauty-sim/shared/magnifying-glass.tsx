// @client-reason: Canvas-based magnifier overlay shown during eyebrow drag (PreView-style)
"use client";

import { useRef, useEffect } from "react";

/** PreView-style: rectangular loupe, fixed at top of photo, aligned to drag side */
const MAG_W = 180;
const MAG_H = 70;
const ZOOM = 1.4;

function drawMagnifier(
    canvas: HTMLCanvasElement,
    magCanvas: HTMLCanvasElement,
    containerRect: DOMRect,
    pointerX: number,
    pointerY: number,
): void {
    const dpr = globalThis.devicePixelRatio ?? 1;
    const pxW = Math.round(MAG_W * dpr);
    const pxH = Math.round(MAG_H * dpr);

    if (magCanvas.width !== pxW || magCanvas.height !== pxH) {
        magCanvas.width = pxW;
        magCanvas.height = pxH;
    }

    const ctx = magCanvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const relX = pointerX - containerRect.left;
    const relY = pointerY - containerRect.top;
    const scaleX = canvas.width / containerRect.width;
    const scaleY = canvas.height / containerRect.height;
    const srcX = relX * scaleX;
    const srcY = relY * scaleY;
    const srcW = (MAG_W / ZOOM) * scaleX;
    const srcH = (MAG_H / ZOOM) * scaleY;

    ctx.clearRect(0, 0, pxW, pxH);
    ctx.drawImage(canvas, srcX - srcW / 2, srcY - srcH / 2, srcW, srcH, 0, 0, pxW, pxH);
}

export function MagnifyingGlass({ canvasRef, pointerX, pointerY, containerRect, side }: Readonly<{
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    pointerX: number;
    pointerY: number;
    containerRect: DOMRect | null;
    side: "left" | "right";
}>): React.ReactElement | null {
    const magCanvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const magCanvas = magCanvasRef.current;
        if (!canvas || !magCanvas || !containerRect) return;
        drawMagnifier(canvas, magCanvas, containerRect, pointerX, pointerY);
    }, [canvasRef, pointerX, pointerY, containerRect]);

    if (!containerRect) return null;

    return (
        <div
            className={`pointer-events-none fixed top-0 z-[100] h-[70px] w-[180px] overflow-hidden rounded-xl border-2 border-white/70 bg-black/20 shadow-lg backdrop-blur-sm ${side === "left" ? "left-2" : "right-2"}`}
            aria-hidden="true"
        >
            <canvas ref={magCanvasRef} className="h-full w-full" />
        </div>
    );
}
