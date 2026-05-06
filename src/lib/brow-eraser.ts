/**
 * Eyebrow Eraser — soft-blur natural eyebrows for clean template overlay.
 *
 * V4: Horizontal bar (rounded rectangle) aligned to brow angle.
 * Eye corners define the width, brow landmarks define the thin height.
 * Bar shape matches natural eyebrow proportions — wide and thin.
 */

const R_BROW_UPPER = [70, 63, 105, 66, 107];
const L_BROW_UPPER = [300, 293, 334, 296, 336];

const R_EYE_INNER = 133;
const R_EYE_OUTER = 33;
const R_EYE_TOP = 159;
const L_EYE_INNER = 362;
const L_EYE_OUTER = 263;
const L_EYE_TOP = 386;

const LEFT_CHEEK = 234;
const RIGHT_CHEEK = 454;
const FOREHEAD_TOP = 10;

interface Point { x: number; y: number }

function lmPx(lm: Array<{ x: number; y: number }>, idx: number, w: number, h: number): Point {
    const p = lm.at(idx);
    return { x: (p?.x ?? 0) * w, y: (p?.y ?? 0) * h };
}

function avgPt(lm: Array<{ x: number; y: number }>, indices: number[], w: number, h: number): Point {
    let sx = 0;
    let sy = 0;
    for (const idx of indices) {
        const p = lmPx(lm, idx, w, h);
        sx += p.x;
        sy += p.y;
    }
    return { x: sx / indices.length, y: sy / indices.length };
}

/**
 * Draw a horizontal rounded-rect bar covering the eyebrow region.
 * Width from eye corners, height just enough for brow thickness.
 * Rotated to match the natural brow angle.
 */
function drawBrowBar(
    ctx: CanvasRenderingContext2D,
    lm: Array<{ x: number; y: number }>,
    eyeInner: number, eyeOuter: number, eyeTop: number,
    browUpper: number[],
    w: number, h: number,
): void {
    const inner = lmPx(lm, eyeInner, w, h);
    const outer = lmPx(lm, eyeOuter, w, h);
    const top = lmPx(lm, eyeTop, w, h);
    const browCenter = avgPt(lm, browUpper, w, h);

    const eyeWidth = Math.abs(inner.x - outer.x);
    const browToEye = Math.abs(browCenter.y - top.y);

    const barW = eyeWidth * 1.3;
    const barH = browToEye * 0.9;
    const cx = browCenter.x;
    const cy = browCenter.y;
    const radius = barH * 0.45;

    const browStart = lmPx(lm, browUpper.at(0) ?? 0, w, h);
    const browEnd = lmPx(lm, browUpper.at(-1) ?? 0, w, h);
    const angle = Math.atan2(browEnd.y - browStart.y, browEnd.x - browStart.x);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.roundRect(-barW / 2, -barH / 2, barW, barH, radius);
    ctx.restore();
}

/**
 * Sample average skin color from forehead area (above eyebrows).
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
 * Draw both brow bars onto the given context (as a single path for fill/clip).
 */
function drawBothBrows(
    ctx: CanvasRenderingContext2D,
    lm: Array<{ x: number; y: number }>,
    w: number, h: number,
): void {
    ctx.beginPath();
    drawBrowBar(ctx, lm, R_EYE_INNER, R_EYE_OUTER, R_EYE_TOP, R_BROW_UPPER, w, h);
    drawBrowBar(ctx, lm, L_EYE_INNER, L_EYE_OUTER, L_EYE_TOP, L_BROW_UPPER, w, h);
}

/**
 * Erase natural eyebrows using large elliptical regions + multi-pass blur + skin-tone fill.
 *
 * Pipeline:
 *   1. Sample skin tone from forehead
 *   2. Double-blur for heavy smoothing
 *   3. Skin-tone fill at 45% opacity to neutralize dark remnants
 *   4. Final blend blur
 *   5. Soft-edged elliptical mask → composite onto original
 */
// eslint-disable-next-line max-lines-per-function -- Multi-pass canvas pipeline, splitting would obscure the sequential flow
export function eraseBrowRegion(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    lm: Array<{ x: number; y: number }>,
    w: number,
    h: number,
): void {
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

    // Pass 2: double blur
    const blur2 = document.createElement("canvas");
    blur2.width = w;
    blur2.height = h;
    const blur2Ctx = blur2.getContext("2d");
    if (!blur2Ctx) return;
    blur2Ctx.filter = `blur(${Math.round(blurPx * 0.6)}px)`;
    blur2Ctx.drawImage(blur1, 0, 0);
    blur2Ctx.filter = "none";

    // Pass 3: skin-tone fill
    blur2Ctx.globalAlpha = 0.45;
    blur2Ctx.fillStyle = skinColor;
    drawBothBrows(blur2Ctx, lm, w, h);
    blur2Ctx.fill();
    blur2Ctx.globalAlpha = 1.0;

    // Pass 4: blend blur
    const blur3 = document.createElement("canvas");
    blur3.width = w;
    blur3.height = h;
    const blur3Ctx = blur3.getContext("2d");
    if (!blur3Ctx) return;
    blur3Ctx.filter = `blur(${Math.round(edgeBlur * 0.5)}px)`;
    blur3Ctx.drawImage(blur2, 0, 0);
    blur3Ctx.filter = "none";

    // Soft-edged elliptical mask
    const maskCvs = document.createElement("canvas");
    maskCvs.width = w;
    maskCvs.height = h;
    const maskCtx = maskCvs.getContext("2d");
    if (!maskCtx) return;
    maskCtx.fillStyle = "#fff";
    drawBothBrows(maskCtx, lm, w, h);
    maskCtx.fill();

    const softCvs = document.createElement("canvas");
    softCvs.width = w;
    softCvs.height = h;
    const softCtx = softCvs.getContext("2d");
    if (!softCtx) return;
    softCtx.filter = `blur(${edgeBlur}px)`;
    softCtx.drawImage(maskCvs, 0, 0);

    // Apply mask → composite
    blur3Ctx.globalCompositeOperation = "destination-in";
    blur3Ctx.drawImage(softCvs, 0, 0);
    ctx.drawImage(blur3, 0, 0);
}
