/**
 * Lip Renderer — Client-side canvas engine for lip color simulation.
 *
 * Uses MediaPipe lip landmarks to fill with selected color via multiply blend.
 * Preserves skin texture while applying natural-looking lip tint.
 */

import type { LandmarkData } from "./eyebrow-renderer";

// ─── Lip Landmark Indices ───────────────────────────────────────────────────

const LIP_OUTER_UPPER = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291];
const LIP_OUTER_LOWER = [291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61];
const LIP_INNER_UPPER = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308];
const LIP_INNER_LOWER = [308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78];

// ─── Types ──────────────────────────────────────────────────────────────────

interface Point { x: number; y: number }

export interface LipParams {
    color: string;       // hex color
    saturation: number;  // 0~100 (50=no color, 100=max intensity)
}

export const DEFAULT_LIP_PARAMS: Readonly<LipParams> = {
    color: "#c45c6a",
    saturation: 55,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function lmPx(lm: Array<{ x: number; y: number }>, idx: number, w: number, h: number): Point {
    const p = lm.at(idx);
    return { x: (p?.x ?? 0) * w, y: (p?.y ?? 0) * h };
}

function drawLipPath(
    ctx: CanvasRenderingContext2D,
    lm: Array<{ x: number; y: number }>,
    indices: number[],
    w: number, h: number,
): void {
    const first = lmPx(lm, indices[0], w, h);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < indices.length; i++) {
        // eslint-disable-next-line security/detect-object-injection -- Safe: i is a sequential loop index bounded by indices.length
        const p = lmPx(lm, indices[i], w, h);
        ctx.lineTo(p.x, p.y);
    }
}

// ─── Main Lip Rendering ────────────────────────────────────────────────────

/** Create blurred lip overlay canvas with outer + inner lip shapes */
function createLipOverlay(
    lm: Array<{ x: number; y: number }>, w: number, h: number, color: string,
): HTMLCanvasElement | null {
    const lipCanvas = document.createElement("canvas");
    lipCanvas.width = w;
    lipCanvas.height = h;
    const lipCtx = lipCanvas.getContext("2d");
    if (!lipCtx) return null;

    lipCtx.beginPath();
    drawLipPath(lipCtx, lm, LIP_OUTER_UPPER, w, h);
    drawLipPath(lipCtx, lm, LIP_OUTER_LOWER, w, h);
    lipCtx.closePath();
    lipCtx.fillStyle = color;
    lipCtx.fill();

    lipCtx.beginPath();
    drawLipPath(lipCtx, lm, LIP_INNER_UPPER, w, h);
    drawLipPath(lipCtx, lm, LIP_INNER_LOWER, w, h);
    lipCtx.closePath();
    lipCtx.globalAlpha = 0.3;
    lipCtx.fillStyle = color;
    lipCtx.fill();

    const blurCanvas = document.createElement("canvas");
    blurCanvas.width = w;
    blurCanvas.height = h;
    const blurCtx = blurCanvas.getContext("2d");
    if (!blurCtx) return null;

    blurCtx.filter = `blur(${String(Math.max(1, w * 0.003))}px)`;
    blurCtx.drawImage(lipCanvas, 0, 0);
    return blurCanvas;
}

/**
 * Render lip color directly onto a canvas context.
 * Call AFTER eyebrow rendering (or on its own for lip-only mode).
 */
export function renderLipsToCanvas(
    canvas: HTMLCanvasElement,
    landmarks: LandmarkData,
    params: LipParams,
): void {
    const alpha = Math.max(0, (params.saturation - 50) / 50);
    if (alpha <= 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const overlay = createLipOverlay(landmarks.points, canvas.width, canvas.height, params.color);
    if (!overlay) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(overlay, 0, 0);

    ctx.globalAlpha = alpha * 0.3;
    ctx.globalCompositeOperation = "soft-light";
    ctx.drawImage(overlay, 0, 0);

    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
}
