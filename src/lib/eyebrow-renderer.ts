/**
 * Eyebrow Renderer — Client-side canvas engine for beauty simulation.
 *
 * Pipeline: draw image → compute placement → overlay template on top of natural brows.
 * Template images (PNG) are loaded from Supabase Storage and cached for performance.
 * Natural eyebrows are PRESERVED — templates ADD strokes on top (semi-permanent concept).
 */

import type { EyebrowTemplate } from "./eyebrow-templates";

// ─── Landmark Indices ────────────────────────────────────────────────────────

export const R_EYE_INNER = 133;
export const R_EYE_OUTER = 33;
export const R_EYE_TOP = 159;
export const L_EYE_INNER = 362;
export const L_EYE_OUTER = 263;
export const L_EYE_TOP = 386;
export const FOREHEAD_TOP = 10;

// ─── Types ──────────────────────────────────────────────────────────────────

interface Point { x: number; y: number }

export interface LandmarkData {
    points: Array<{ x: number; y: number; z: number }>;
    imageWidth: number;
    imageHeight: number;
}

/** Adjustable parameters for real-time fitting room controls */
export interface AdjustmentParams {
    scaleX: number;      // 가로 0.5~1.5 (default 1.0)
    scaleY: number;      // 세로 0.5~1.5 (default 1.0)
    angleOffset: number; // 각도 offset in radians -0.3~0.3 (default 0)
    opacity: number;     // 진하기 0.3~1.0 (default 0.8)
    offsetX: number;     // 좌우 위치 offset in pixels, unlimited (default 0)
    offsetY: number;     // 상하 위치 offset in pixels, unlimited (default 0)
}

/** Independent left/right brow adjustments */
export interface BrowSideParams {
    left: AdjustmentParams;
    right: AdjustmentParams;
}

export const DEFAULT_ADJUSTMENT: Readonly<AdjustmentParams> = {
    scaleX: 1.0,
    scaleY: 1.0,
    angleOffset: 0,
    opacity: 0.5,
    offsetX: 0,
    offsetY: 0,
};

interface BrowPlacement {
    centerX: number;
    centerY: number;
    length: number;
    angle: number;
    thickness: number;
}

// ─── Template Image Cache ───────────────────────────────────────────────────

const templateImageCache = new Map<string, HTMLImageElement>();
const transparentCache = new Map<string, HTMLCanvasElement>();

/** Load a template image with CORS support, cached by URL */
function loadTemplateImage(url: string): Promise<HTMLImageElement> {
    const cached = templateImageCache.get(url);
    if (cached) return Promise.resolve(cached);

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            templateImageCache.set(url, img);
            resolve(img);
        };
        img.onerror = reject;
        img.src = url;
    });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const MAX_CANVAS = 2048;

function lmPx(lm: Array<{ x: number; y: number }>, idx: number, w: number, h: number): Point {
    const p = lm.at(idx);
    return { x: (p?.x ?? 0) * w, y: (p?.y ?? 0) * h };
}

// ─── Brow Placement Computation ─────────────────────────────────────────────

export function computePlacement(
    lm: Array<{ x: number; y: number }>,
    w: number, h: number,
    eyeInner: number, eyeOuter: number, eyeTop: number,
    isRight: boolean,
): BrowPlacement {
    const inner = lmPx(lm, eyeInner, w, h);
    const outer = lmPx(lm, eyeOuter, w, h);
    const top = lmPx(lm, eyeTop, w, h);
    const forehead = lmPx(lm, FOREHEAD_TOP, w, h);

    const browDist = Math.abs(top.y - forehead.y);
    const eyeWidth = Math.abs(outer.x - inner.x);

    const browCenterY = top.y - browDist * 0.35;
    const extend = eyeWidth * 0.10;

    const startX = isRight ? outer.x - extend : inner.x - extend;
    const endX = isRight ? inner.x + extend : outer.x + extend;
    const centerX = (startX + endX) / 2;

    const startY = browCenterY;
    const endY = browCenterY + browDist * 0.02;
    const centerY = (startY + endY) / 2;

    const length = Math.abs(endX - startX) * 1.4;
    const angle = Math.atan2(endY - startY, endX - startX);
    const thickness = browDist * 0.28;

    return { centerX, centerY, length, angle, thickness };
}

// ─── Template Transparency ──────────────────────────────────────────────────

/** Default brow tint color — dark brown, natural for most skin tones */
const DEFAULT_BROW_RGB = { r: 58, g: 42, b: 26 }; // #3a2a1a

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace("#", "");
    return {
        r: parseInt(h.substring(0, 2), 16),
        g: parseInt(h.substring(2, 4), 16),
        b: parseInt(h.substring(4, 6), 16),
    };
}

 

/** Horizontal max-filter pass — part of separable dilation */
function dilateH(src: Float32Array, dst: Float32Array, w: number, h: number, r: number): void {
    for (let y = 0; y < h; y++) {
        const row = y * w;
        for (let x = 0; x < w; x++) {
            let max = 0;
            for (let nx = Math.max(0, x - r); nx <= Math.min(w - 1, x + r); nx++) {
                const v = src.at(row + nx) ?? 0;
                if (v > max) max = v;
            }
            dst.fill(max, row + x, row + x + 1);
        }
    }
}

/** Vertical max-filter pass — part of separable dilation */
function dilateV(src: Float32Array, dst: Float32Array, w: number, h: number, r: number): void {
    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
            let max = 0;
            for (let ny = Math.max(0, y - r); ny <= Math.min(h - 1, y + r); ny++) {
                const v = src.at(ny * w + x) ?? 0;
                if (v > max) max = v;
            }
            const idx = y * w + x;
            dst.fill(max, idx, idx + 1);
        }
    }
}

 

/**
 * Dilate luminance using separable max-filter (horizontal then vertical).
 * Thickens thin hair strokes so they survive the ~7x downscale to canvas size.
 * Template strokes are ~2-3px wide at 1362px; rendered at ~190px they become sub-pixel dots.
 * Radius 3 adds ~6px → strokes become ~8-9px → ~1.2px after downscale = visible lines.
 */
function dilateLuminance(lum: Float32Array, w: number, h: number, radius: number): Float32Array {
    const temp = new Float32Array(w * h);
    const out = new Float32Array(w * h);
    dilateH(lum, temp, w, h, radius);
    dilateV(temp, out, w, h, radius);
    return out;
}

/**
 * Convert opaque template PNG to tinted transparent overlay.
 *
 * Template images are fully opaque PNGs: light/white brow strokes on black bg.
 * Pipeline:
 *   1. Extract luminance per pixel
 *   2. Dilate luminance (max-filter radius 3) to thicken fine strokes
 *   3. Dilated luminance → alpha (gamma 0.4 boosts mid-tones)
 *   4. RGB replaced with browColor (dark brown) for natural appearance on skin
 */
/** Extract luminance from RGBA pixel data, return array + max luminance */
function extractLuminance(px: Uint8ClampedArray, count: number): { lum: Float32Array; maxLum: number } {
    const lum = new Float32Array(count);
    let maxLum = 1;
    for (let i = 0; i < count; i++) {
        const off = i * 4;
        const v = (px.at(off) ?? 0) * 0.299 + (px.at(off + 1) ?? 0) * 0.587 + (px.at(off + 2) ?? 0) * 0.114;
        lum.fill(v, i, i + 1);
        if (v > maxLum) maxLum = v;
    }
    return { lum, maxLum };
}

/** Apply dilated luminance as alpha + replace RGB with brow color */
function applyTint(
    px: Uint8ClampedArray, dilated: Float32Array, maxLum: number,
    browColor: { r: number; g: number; b: number }, count: number,
): void {
    const GAMMA = 0.6;
    const NOISE_FLOOR = 15;
    for (let i = 0; i < count; i++) {
        const off = i * 4;
        const lum = dilated.at(i) ?? 0;
        const norm = lum / maxLum;
        const alpha = lum < NOISE_FLOOR ? 0 : Math.min(255, Math.round(Math.pow(norm, GAMMA) * 255));
        px.fill(browColor.r, off, off + 1);
        px.fill(browColor.g, off + 1, off + 2);
        px.fill(browColor.b, off + 2, off + 3);
        px.fill(alpha, off + 3, off + 4);
    }
}

function makeTransparent(
    templateImg: HTMLImageElement,
    browColor = DEFAULT_BROW_RGB,
): HTMLCanvasElement {
    const tw = templateImg.naturalWidth;
    const th = templateImg.naturalHeight;

    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    ctx.drawImage(templateImg, 0, 0);
    const imageData = ctx.getImageData(0, 0, tw, th);
    const pixelCount = tw * th;

    const { lum, maxLum } = extractLuminance(imageData.data, pixelCount);
    const dilated = dilateLuminance(lum, tw, th, 2);
    applyTint(imageData.data, dilated, maxLum, browColor, pixelCount);

    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

/** Render a single brow by drawing the template image at the computed placement */
function renderBrow(
    ctx: CanvasRenderingContext2D,
    templateImg: HTMLImageElement | HTMLCanvasElement,
    placement: BrowPlacement,
    mirror: boolean,
    adj: AdjustmentParams = DEFAULT_ADJUSTMENT,
): void {
    const imgW = templateImg instanceof HTMLImageElement ? templateImg.naturalWidth : templateImg.width;
    const imgH = templateImg instanceof HTMLImageElement ? templateImg.naturalHeight : templateImg.height;
    if (imgW === 0 || imgH === 0) return;

    ctx.save();

    ctx.globalAlpha = adj.opacity;
    ctx.translate(placement.centerX + adj.offsetX, placement.centerY + adj.offsetY);
    ctx.rotate(placement.angle + adj.angleOffset);

    if (mirror) {
        ctx.scale(-1, 1);
    }

    // Preserve original template aspect ratio for natural brow fullness
    const templateAspect = imgW / imgH;
    const drawWidth = placement.length * adj.scaleX;
    const drawHeight = (drawWidth / templateAspect) * adj.scaleY;

    ctx.drawImage(templateImg, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    ctx.restore();
}

// ─── Main Pipeline ──────────────────────────────────────────────────────────

export async function applyEyebrowSimulation(
    originalImage: HTMLImageElement,
    landmarks: LandmarkData,
    template: EyebrowTemplate,
    browColor = "#3a2a1a",
): Promise<string> {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, MAX_CANVAS / Math.max(originalImage.naturalWidth, originalImage.naturalHeight));
    canvas.width = Math.round(originalImage.naturalWidth * scale);
    canvas.height = Math.round(originalImage.naturalHeight * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    const w = canvas.width;
    const h = canvas.height;

    // Draw original image — natural eyebrows preserved
    ctx.drawImage(originalImage, 0, 0, w, h);

    const lm = landmarks.points;
    const rightBrow = computePlacement(lm, w, h, R_EYE_INNER, R_EYE_OUTER, R_EYE_TOP, true);
    const leftBrow = computePlacement(lm, w, h, L_EYE_INNER, L_EYE_OUTER, L_EYE_TOP, false);

    // Load template and tint — cached to avoid reprocessing
    const templateImg = await loadTemplateImage(template.imageUrl);
    const cacheKey = `${template.imageUrl}|${browColor}`;
    let transparent = transparentCache.get(cacheKey);
    if (!transparent) {
        transparent = makeTransparent(templateImg, hexToRgb(browColor));
        transparentCache.set(cacheKey, transparent);
    }

    // Overlay brows on top of natural eyebrows (semi-permanent concept)
    const overlayCanvas = document.createElement("canvas");
    overlayCanvas.width = w;
    overlayCanvas.height = h;
    const overlayCtx = overlayCanvas.getContext("2d");
    if (!overlayCtx) return "";

    renderBrow(overlayCtx, transparent, rightBrow, true);
    renderBrow(overlayCtx, transparent, leftBrow, false);

    // Overlay brow strokes on top of natural eyebrows
    ctx.drawImage(overlayCanvas, 0, 0);

    return canvas.toDataURL("image/png");
}

// ─── Real-Time Fitting Room Pipeline ────────────────────────────────────────

/**
 * Render eyebrows directly to a persistent canvas for real-time slider updates.
 * Natural brows preserved — template strokes overlay on top (semi-permanent concept).
 */
export async function renderEyebrowsToCanvas(
    canvas: HTMLCanvasElement,
    originalImage: HTMLImageElement,
    landmarks: LandmarkData,
    template: EyebrowTemplate,
    browColor: string,
    sideParams: BrowSideParams = { left: { ...DEFAULT_ADJUSTMENT }, right: { ...DEFAULT_ADJUSTMENT } },
): Promise<void> {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Draw original image — natural eyebrows preserved
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(originalImage, 0, 0, w, h);

    const lm = landmarks.points;
    const rightBrow = computePlacement(lm, w, h, R_EYE_INNER, R_EYE_OUTER, R_EYE_TOP, true);
    const leftBrow = computePlacement(lm, w, h, L_EYE_INNER, L_EYE_OUTER, L_EYE_TOP, false);

    // Load template and tint — cached so drag doesn't re-process 500K pixels per frame
    const templateImg = await loadTemplateImage(template.imageUrl);
    const cacheKey = `${template.imageUrl}|${browColor}`;
    let transparent = transparentCache.get(cacheKey);
    if (!transparent) {
        transparent = makeTransparent(templateImg, hexToRgb(browColor));
        transparentCache.set(cacheKey, transparent);
    }

    // Render brows to overlay canvas
    const overlayCanvas = document.createElement("canvas");
    overlayCanvas.width = w;
    overlayCanvas.height = h;
    const overlayCtx = overlayCanvas.getContext("2d");
    if (!overlayCtx) return;

    renderBrow(overlayCtx, transparent, rightBrow, true, sideParams.right);
    renderBrow(overlayCtx, transparent, leftBrow, false, sideParams.left);

    // Overlay brow strokes on top of natural eyebrows
    ctx.drawImage(overlayCanvas, 0, 0);
}

/** Prepare a canvas with proper dimensions for a given image */
export function prepareCanvas(canvas: HTMLCanvasElement, image: HTMLImageElement): void {
    const scale = Math.min(1, MAX_CANVAS / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
}
