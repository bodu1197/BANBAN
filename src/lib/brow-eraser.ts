/**
 * Eyebrow Eraser — soft-blur natural eyebrows for clean template overlay.
 * Uses MediaPipe face mesh landmarks to define brow contour polygons,
 * then replaces brow regions with heavily blurred skin (feathered edges).
 */

const R_BROW_UPPER = [70, 63, 105, 66, 107];
const R_BROW_LOWER = [46, 53, 52, 65, 55];
const L_BROW_UPPER = [300, 293, 334, 296, 336];
const L_BROW_LOWER = [276, 283, 282, 295, 285];

const LEFT_CHEEK = 234;
const RIGHT_CHEEK = 454;

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
 * Erase natural eyebrows by replacing brow regions with heavily blurred skin.
 *
 * Pipeline:
 *   1. Create a heavily blurred copy of the canvas
 *   2. Build a soft-edged mask from brow landmark polygons
 *   3. Apply mask to blurred copy (destination-in compositing)
 *   4. Overlay masked blur onto original canvas (source-over)
 */
export function eraseBrowRegion(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    lm: Array<{ x: number; y: number }>,
    w: number,
    h: number,
): void {
    const expand = 0.35;
    const rBrow = browContour(lm, R_BROW_UPPER, R_BROW_LOWER, w, h, expand);
    const lBrow = browContour(lm, L_BROW_UPPER, L_BROW_LOWER, w, h, expand);

    const faceW = Math.abs(lmPx(lm, LEFT_CHEEK, w, h).x - lmPx(lm, RIGHT_CHEEK, w, h).x);
    const blurPx = Math.max(8, Math.round(faceW * 0.08));
    const edgeBlur = Math.max(4, Math.round(blurPx * 0.5));

    const blurCvs = document.createElement("canvas");
    blurCvs.width = w;
    blurCvs.height = h;
    const blurCtx = blurCvs.getContext("2d");
    if (!blurCtx) return;
    blurCtx.filter = `blur(${blurPx}px)`;
    blurCtx.drawImage(canvas, 0, 0);
    blurCtx.filter = "none";

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

    blurCtx.globalCompositeOperation = "destination-in";
    blurCtx.drawImage(softCvs, 0, 0);

    ctx.drawImage(blurCvs, 0, 0);
}
