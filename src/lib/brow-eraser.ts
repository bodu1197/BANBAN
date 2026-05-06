/**
 * Eyebrow Eraser — soft-blur natural eyebrows for clean template overlay.
 * Uses MediaPipe face mesh landmarks to define brow contour polygons,
 * then replaces brow regions with heavily blurred skin + skin-tone fill.
 */

const R_BROW_UPPER = [70, 63, 105, 66, 107];
const R_BROW_LOWER = [46, 53, 52, 65, 55];
const L_BROW_UPPER = [300, 293, 334, 296, 336];
const L_BROW_LOWER = [276, 283, 282, 295, 285];

const LEFT_CHEEK = 234;
const RIGHT_CHEEK = 454;
const FOREHEAD_TOP = 10;

interface Point { x: number; y: number }

function lmPx(lm: Array<{ x: number; y: number }>, idx: number, w: number, h: number): Point {
    const p = lm.at(idx);
    return { x: (p?.x ?? 0) * w, y: (p?.y ?? 0) * h };
}

function browContour(
    lm: Array<{ x: number; y: number }>,
    upper: number[],
    lower: number[],
    w: number, h: number,
    expand: number,
): Point[] {
    const uPts = upper.map(i => lmPx(lm, i, w, h));
    const lPts = [...lower].reverse().map(i => lmPx(lm, i, w, h));
    const all = [...uPts, ...lPts];

    const cx = all.reduce((s, p) => s + p.x, 0) / all.length;
    const cy = all.reduce((s, p) => s + p.y, 0) / all.length;

    return all.map(p => ({
        x: cx + (p.x - cx) * (1 + expand),
        y: cy + (p.y - cy) * (1 + expand),
    }));
}

function tracePath(ctx: CanvasRenderingContext2D, pts: Point[]): void {
    const first = pts.at(0);
    if (!first) return;
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < pts.length; i++) {
        const p = pts.at(i);
        if (p) ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
}

/**
 * Sample average skin color from forehead area (above eyebrows).
 * Returns CSS rgba string for blending.
 */
function sampleSkinTone(
    ctx: CanvasRenderingContext2D,
    lm: Array<{ x: number; y: number }>,
    w: number, h: number,
): string {
    const forehead = lmPx(lm, FOREHEAD_TOP, w, h);
    const rBrowTop = lmPx(lm, 70, w, h);
    const lBrowTop = lmPx(lm, 300, w, h);

    const sampleY = Math.round((forehead.y + rBrowTop.y) / 2);
    const sampleX = Math.round((rBrowTop.x + lBrowTop.x) / 2);
    const size = Math.max(10, Math.round(w * 0.03));

    const data = ctx.getImageData(
        Math.max(0, sampleX - size),
        Math.max(0, sampleY - size),
        size * 2,
        size * 2,
    );

    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    const count = data.data.length / 4;
    for (let i = 0; i < data.data.length; i += 4) {
        rSum += data.data.at(i) ?? 0;
        gSum += data.data.at(i + 1) ?? 0;
        bSum += data.data.at(i + 2) ?? 0;
    }

    const r = Math.round(rSum / count);
    const g = Math.round(gSum / count);
    const b = Math.round(bSum / count);
    return `rgb(${r},${g},${b})`;
}

/**
 * Erase natural eyebrows by replacing brow regions with blurred skin + skin-tone fill.
 *
 * Pipeline:
 *   1. Sample skin tone from forehead (above brows)
 *   2. Double-blur the canvas for heavy smoothing
 *   3. Overlay semi-transparent skin-tone fill to neutralize dark remnants
 *   4. Build soft-edged mask from brow landmark polygons
 *   5. Composite masked result onto original canvas
 */
// eslint-disable-next-line max-lines-per-function -- Multi-pass canvas pipeline, splitting would obscure the sequential flow
export function eraseBrowRegion(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    lm: Array<{ x: number; y: number }>,
    w: number,
    h: number,
): void {
    const expand = 0.4;
    const rBrow = browContour(lm, R_BROW_UPPER, R_BROW_LOWER, w, h, expand);
    const lBrow = browContour(lm, L_BROW_UPPER, L_BROW_LOWER, w, h, expand);

    const faceW = Math.abs(lmPx(lm, LEFT_CHEEK, w, h).x - lmPx(lm, RIGHT_CHEEK, w, h).x);
    const blurPx = Math.max(12, Math.round(faceW * 0.12));
    const edgeBlur = Math.max(6, Math.round(blurPx * 0.6));

    const skinColor = sampleSkinTone(ctx, lm, w, h);

    // Pass 1: heavy blur
    const blur1 = document.createElement("canvas");
    blur1.width = w;
    blur1.height = h;
    const blur1Ctx = blur1.getContext("2d");
    if (!blur1Ctx) return;
    blur1Ctx.filter = `blur(${blurPx}px)`;
    blur1Ctx.drawImage(canvas, 0, 0);
    blur1Ctx.filter = "none";

    // Pass 2: blur the blur for extra smoothing
    const blur2 = document.createElement("canvas");
    blur2.width = w;
    blur2.height = h;
    const blur2Ctx = blur2.getContext("2d");
    if (!blur2Ctx) return;
    blur2Ctx.filter = `blur(${Math.round(blurPx * 0.6)}px)`;
    blur2Ctx.drawImage(blur1, 0, 0);
    blur2Ctx.filter = "none";

    // Pass 3: skin-tone fill to neutralize dark remnants
    blur2Ctx.globalAlpha = 0.45;
    blur2Ctx.fillStyle = skinColor;
    blur2Ctx.beginPath();
    tracePath(blur2Ctx, rBrow);
    tracePath(blur2Ctx, lBrow);
    blur2Ctx.fill();
    blur2Ctx.globalAlpha = 1.0;

    // Pass 4: one more light blur to blend skin-tone edges
    const blur3 = document.createElement("canvas");
    blur3.width = w;
    blur3.height = h;
    const blur3Ctx = blur3.getContext("2d");
    if (!blur3Ctx) return;
    blur3Ctx.filter = `blur(${Math.round(edgeBlur * 0.5)}px)`;
    blur3Ctx.drawImage(blur2, 0, 0);
    blur3Ctx.filter = "none";

    // Soft-edged mask
    const maskCvs = document.createElement("canvas");
    maskCvs.width = w;
    maskCvs.height = h;
    const maskCtx = maskCvs.getContext("2d");
    if (!maskCtx) return;
    maskCtx.fillStyle = "#fff";
    maskCtx.beginPath();
    tracePath(maskCtx, rBrow);
    tracePath(maskCtx, lBrow);
    maskCtx.fill();

    const softCvs = document.createElement("canvas");
    softCvs.width = w;
    softCvs.height = h;
    const softCtx = softCvs.getContext("2d");
    if (!softCtx) return;
    softCtx.filter = `blur(${edgeBlur}px)`;
    softCtx.drawImage(maskCvs, 0, 0);

    // Apply mask to blurred+tinted result
    blur3Ctx.globalCompositeOperation = "destination-in";
    blur3Ctx.drawImage(softCvs, 0, 0);

    // Composite onto original
    ctx.drawImage(blur3, 0, 0);
}
