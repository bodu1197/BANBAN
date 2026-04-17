/**
 * useEyebrowEraser — orchestrates AI-based eyebrow removal.
 *
 * 1. Builds an eyebrow-zone mask from MediaPipe landmarks (ideal brow region,
 *    guaranteed to cover the user's eyebrows regardless of brow thinness).
 * 2. Sends image + mask to /api/ai/eyebrow-remove (FLUX Fill inpaint on
 *    ComfyUI) which paints the masked region with bare forehead skin.
 * 3. Caches the resulting "clean" image so toggling on/off is instant after
 *    the first run.
 */

"use client";

import { useState, useCallback, useRef } from "react";
import type { LandmarkData } from "@/lib/eyebrow-renderer";

interface EraserArgs {
    originalImage: HTMLImageElement;
    originalImageDataUrl: string;
    landmarks: LandmarkData;
}

interface EraserState {
    active: boolean;
    loading: boolean;
    error: string | null;
    cleanImage: HTMLImageElement | null;
    toggle: () => void;
}

function stripDataUrlPrefix(value: string): string {
    const comma = value.indexOf(",");
    return comma >= 0 ? value.slice(comma + 1) : value;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("이미지 로딩 실패"));
        img.src = dataUrl;
    });
}

// eslint-disable-next-line max-lines-per-function -- Stateful hook: toggle + fetch + cache
export function useEyebrowEraser({ originalImage, originalImageDataUrl, landmarks }: Readonly<EraserArgs>): EraserState {
    const [active, setActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cleanImage, setCleanImage] = useState<HTMLImageElement | null>(null);
    const inFlight = useRef(false);

    const runErase = useCallback(async (): Promise<HTMLImageElement | null> => {
        if (inFlight.current) return null;
        inFlight.current = true;
        setLoading(true);
        setError(null);

        try {
            const { generateMask } = await import("@/lib/face-analysis");
            const w = originalImage.naturalWidth;
            const h = originalImage.naturalHeight;
            const maskBase64 = generateMask(landmarks, "eyebrow", w, h);
            if (!maskBase64) throw new Error("마스크 생성 실패");

            const imageBase64 = stripDataUrlPrefix(originalImageDataUrl);

            const res = await fetch("/api/ai/eyebrow-remove", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: imageBase64, mask: maskBase64 }),
            });

            if (!res.ok) {
                const payload = (await res.json().catch(() => ({}))) as { error?: string };
                throw new Error(payload.error || "AI 처리 실패");
            }

            const data = (await res.json()) as { image: string };
            const img = await loadImage(`data:image/png;base64,${data.image}`);
            setCleanImage(img);
            return img;
        } catch (e) {
            setError(e instanceof Error ? e.message : "AI 눈썹 지우기 중 오류가 발생했습니다");
            return null;
        } finally {
            setLoading(false);
            inFlight.current = false;
        }
    }, [originalImage, originalImageDataUrl, landmarks]);

    const toggle = useCallback(() => {
        if (loading) return;
        if (active) {
            setActive(false);
            return;
        }
        if (cleanImage) {
            setActive(true);
            return;
        }
        void runErase().then((img) => {
            if (img) setActive(true);
        });
    }, [active, cleanImage, loading, runErase]);

    return { active, loading, error, cleanImage, toggle };
}
