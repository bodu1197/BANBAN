/**
 * Custom hooks for FittingRoom: canvas rendering, drag interaction, joystick control.
 */

import { useRef, useCallback, useEffect } from "react";
import type React from "react";
import type { AdjustmentParams, BrowSideParams, LandmarkData } from "@/lib/eyebrow-renderer";
import { computePlacement, R_EYE_INNER, R_EYE_OUTER, R_EYE_TOP, L_EYE_INNER, L_EYE_OUTER, L_EYE_TOP } from "@/lib/eyebrow-renderer";
import { ALL_TEMPLATES } from "@/lib/eyebrow-templates";
import type { EyebrowTemplate } from "@/lib/eyebrow-templates";
import type { LipParams } from "@/lib/lip-renderer";
import type { BrowSide } from "./fitting-room-types";
import { DEFAULT_ADJ } from "./fitting-room-types";

// ─── Canvas Rendering Hook ──────────────────────────────────────────────────

interface UseCanvasRenderingArgs {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    image: HTMLImageElement;
    landmarks: LandmarkData;
    selectedTemplate: EyebrowTemplate | null;
    browColor: string;
    leftAdj: AdjustmentParams;
    rightAdj: AdjustmentParams;
    browExcluded: boolean;
    lipEnabled: boolean;
    lipExcluded: boolean;
    lipParams: LipParams;
    startShake: () => void;
}

export function useCanvasRendering({
    canvasRef, image, landmarks, selectedTemplate, browColor,
    leftAdj, rightAdj, browExcluded, lipEnabled, lipExcluded, lipParams, startShake,
}: Readonly<UseCanvasRenderingArgs>): void {
    const renderCanvas = useCallback(async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const { prepareCanvas } = await import("@/lib/eyebrow-renderer");
        if (canvas.width === 0) prepareCanvas(canvas, image);

        if (selectedTemplate && !browExcluded) {
            const { renderEyebrowsToCanvas } = await import("@/lib/eyebrow-renderer");
            const sideParams: BrowSideParams = { left: leftAdj, right: rightAdj };
            await renderEyebrowsToCanvas(canvas, image, landmarks, selectedTemplate, browColor, sideParams);
        } else {
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(image, 0, 0, w, h);
            if (browExcluded) {
                const { renderEyebrowsToCanvas } = await import("@/lib/eyebrow-renderer");
                const first = ALL_TEMPLATES[0];
                if (first) {
                    const sideParams: BrowSideParams = {
                        left: { ...DEFAULT_ADJ, opacity: 0 },
                        right: { ...DEFAULT_ADJ, opacity: 0 },
                    };
                    await renderEyebrowsToCanvas(canvas, image, landmarks, first, browColor, sideParams);
                }
            }
        }

        if (lipEnabled && !lipExcluded) {
            const { renderLipsToCanvas } = await import("@/lib/lip-renderer");
            renderLipsToCanvas(canvas, landmarks, lipParams);
        }

        startShake();
    }, [canvasRef, selectedTemplate, browColor, leftAdj, rightAdj, browExcluded, lipEnabled, lipExcluded, lipParams, image, landmarks, startShake]);

    useEffect(() => {
        const raf = requestAnimationFrame(() => { void renderCanvas(); });
        return () => cancelAnimationFrame(raf);
    }, [renderCanvas]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        void import("@/lib/eyebrow-renderer").then(({ prepareCanvas }) => {
            prepareCanvas(canvas, image);
        });
    }, [canvasRef, image]);
}

// ─── Shake Animation Hook ───────────────────────────────────────────────────

export function useShakeAnimation(
    initialOffsetY: number,
    setLeftAdj: React.Dispatch<React.SetStateAction<AdjustmentParams>>,
    setRightAdj: React.Dispatch<React.SetStateAction<AdjustmentParams>>,
): () => void {
    const shakeStarted = useRef(false);
    const shakeRaf = useRef(0);

    const startShake = useCallback(() => {
        if (shakeStarted.current) return;
        shakeStarted.current = true;
        const baseY = initialOffsetY;
        const DURATION = 2000;
        const AMPLITUDE = Math.abs(baseY) * 0.3;
        const FREQ = 3;
        const start = performance.now();
        const animate = (now: number): void => {
            const elapsed = now - start;
            if (elapsed >= DURATION) return;
            const t = elapsed / DURATION;
            const decay = 1 - t;
            const wave = Math.sin(t * FREQ * 2 * Math.PI) * AMPLITUDE * decay;
            const yOffset = baseY + wave;
            setLeftAdj((prev) => ({ ...prev, offsetY: yOffset }));
            setRightAdj((prev) => ({ ...prev, offsetY: yOffset }));
            shakeRaf.current = requestAnimationFrame(animate);
        };
        shakeRaf.current = requestAnimationFrame(animate);
    }, [initialOffsetY, setLeftAdj, setRightAdj]);

    useEffect(() => () => cancelAnimationFrame(shakeRaf.current), []);

    return startShake;
}

// ─── Drag Helpers ───────────────────────────────────────────────────────────

/** Determine which brow (screen side) is closest to the click point in canvas coords. */
function detectClosestBrow(
    clickCX: number, clickCY: number,
    lmData: LandmarkData, cw: number, ch: number,
    lAdj: AdjustmentParams, rAdj: AdjustmentParams,
): "left" | "right" {
    const lm = lmData.points;
    const rBrow = computePlacement(lm, cw, ch, R_EYE_INNER, R_EYE_OUTER, R_EYE_TOP, true);
    const lBrow = computePlacement(lm, cw, ch, L_EYE_INNER, L_EYE_OUTER, L_EYE_TOP, false);
    const distR = (clickCX - rBrow.centerX - rAdj.offsetX) ** 2 + (clickCY - rBrow.centerY - rAdj.offsetY) ** 2;
    const distL = (clickCX - lBrow.centerX - lAdj.offsetX) ** 2 + (clickCY - lBrow.centerY - lAdj.offsetY) ** 2;
    return distR < distL ? "left" : "right";
}

// ─── Drag Handlers Hook ─────────────────────────────────────────────────────

interface BrowDragConfig {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    landmarks: LandmarkData;
    leftAdj: AdjustmentParams;
    rightAdj: AdjustmentParams;
    setLeftAdj: React.Dispatch<React.SetStateAction<AdjustmentParams>>;
    setRightAdj: React.Dispatch<React.SetStateAction<AdjustmentParams>>;
    isComparing: boolean;
    joystickActive: boolean;
    setJoystickActive: React.Dispatch<React.SetStateAction<boolean>>;
    setDragVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setDragPointer: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
    setDragSideState: React.Dispatch<React.SetStateAction<"left" | "right">>;
}

interface DragHandlers {
    handleDragStart: (e: React.PointerEvent) => void;
    handleDragMove: (e: React.PointerEvent) => void;
    handleDragEnd: (e: React.PointerEvent) => void;
}

/** Convert pointer event to canvas coordinates. */
function pointerToCanvas(e: React.PointerEvent, canvas: HTMLCanvasElement): { cx: number; cy: number; scaleX: number; scaleY: number } {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { cx: (e.clientX - rect.left) * scaleX, cy: (e.clientY - rect.top) * scaleY, scaleX, scaleY };
}

export function useBrowDrag(config: Readonly<BrowDragConfig>): Readonly<DragHandlers> {
    const { canvasRef, landmarks, leftAdj, rightAdj, setLeftAdj, setRightAdj, isComparing, joystickActive, setJoystickActive, setDragVisible, setDragPointer, setDragSideState } = config;
    const dragStart = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
    const dragSideRef = useRef<"left" | "right">("left");
    const isDraggingRef = useRef(false);

    const handleDragStart = useCallback((e: React.PointerEvent) => {
        if (isComparing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const { cx, cy } = pointerToCanvas(e, canvas);
        const side = detectClosestBrow(cx, cy, landmarks, canvas.width, canvas.height, leftAdj, rightAdj);
        const adj = side === "left" ? rightAdj : leftAdj;
        dragSideRef.current = side;
        isDraggingRef.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY, offsetX: adj.offsetX, offsetY: adj.offsetY };
        setDragVisible(true);
        setDragPointer({ x: e.clientX, y: e.clientY });
        setDragSideState(side);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }, [canvasRef, isComparing, leftAdj, rightAdj, landmarks, setDragVisible, setDragPointer, setDragSideState]);

    const handleDragMove = useCallback((e: React.PointerEvent) => {
        if (!isDraggingRef.current) return;
        setDragPointer({ x: e.clientX, y: e.clientY });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const { scaleX, scaleY } = pointerToCanvas(e, canvas);
        const ds = dragStart.current;
        const newOffsetX = ds.offsetX + (e.clientX - ds.x) * scaleX;
        const newOffsetY = ds.offsetY + (e.clientY - ds.y) * scaleY;
        const setter = dragSideRef.current === "left" ? setRightAdj : setLeftAdj;
        setter((prev) => ({ ...prev, offsetX: newOffsetX, offsetY: newOffsetY }));
    }, [canvasRef, setDragPointer, setLeftAdj, setRightAdj]);

    const handleDragEnd = useCallback((e: React.PointerEvent) => {
        const ds = dragStart.current;
        if (Math.abs(e.clientX - ds.x) < 4 && Math.abs(e.clientY - ds.y) < 4 && joystickActive) {
            setJoystickActive(false);
        }
        isDraggingRef.current = false;
        setDragVisible(false);
        setDragPointer(null);
    }, [joystickActive, setJoystickActive, setDragVisible, setDragPointer]);

    return { handleDragStart, handleDragMove, handleDragEnd };
}

// ─── Joystick Handlers Hook ─────────────────────────────────────────────────

interface JoystickHandlers {
    handleJoystickMove: (dx: number, dy: number) => void;
    handleJoystickStart: () => void;
    handleJoystickEnd: () => void;
}

export function useJoystickHandlers(
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    containerRef: React.RefObject<HTMLDivElement | null>,
    browSide: BrowSide,
    setLeftAdj: React.Dispatch<React.SetStateAction<AdjustmentParams>>,
    setRightAdj: React.Dispatch<React.SetStateAction<AdjustmentParams>>,
    setJoystickActive: React.Dispatch<React.SetStateAction<boolean>>,
): Readonly<JoystickHandlers> {
    const handleJoystickMove = useCallback((dx: number, dy: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const container = containerRef.current;
        if (!container) return;
        const scaleX = canvas.width / container.clientWidth;
        const scaleY = canvas.height / container.clientHeight;
        const cdx = dx * scaleX;
        const cdy = dy * scaleY;

        if (browSide === "both") {
            setLeftAdj((prev) => ({ ...prev, offsetX: prev.offsetX + cdx, offsetY: prev.offsetY + cdy }));
            setRightAdj((prev) => ({ ...prev, offsetX: prev.offsetX + cdx, offsetY: prev.offsetY + cdy }));
        } else if (browSide === "left") {
            setRightAdj((prev) => ({ ...prev, offsetX: prev.offsetX + cdx, offsetY: prev.offsetY + cdy }));
        } else {
            setLeftAdj((prev) => ({ ...prev, offsetX: prev.offsetX + cdx, offsetY: prev.offsetY + cdy }));
        }
    }, [canvasRef, containerRef, browSide, setLeftAdj, setRightAdj]);

    const handleJoystickStart = useCallback(() => setJoystickActive(true), [setJoystickActive]);
    const handleJoystickEnd = useCallback(() => { /* keep zoomed — user taps photo to un-zoom */ }, []);

    return { handleJoystickMove, handleJoystickStart, handleJoystickEnd };
}
