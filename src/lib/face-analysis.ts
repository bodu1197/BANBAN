/**
 * Face Analysis — MediaPipe landmark extraction + face shape analysis + mask generation.
 * Extracts face metrics from 468 landmarks, recommends styles, creates inpainting masks.
 */

// ─── MediaPipe landmark indices ─────────────────────────────────────────────

// Eyebrow landmarks
const R_BROW_UPPER = [70, 63, 105, 66, 107];
const R_BROW_LOWER = [46, 53, 52, 65, 55];

// Lip landmarks
const LIP_OUTER_UPPER = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291];
const LIP_OUTER_LOWER = [291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61];

// Eye landmarks (for ideal brow zone calculation)
const R_EYE_INNER = 133;
const R_EYE_OUTER = 33;
const R_EYE_TOP = 159;
const L_EYE_INNER = 362;
const L_EYE_OUTER = 263;
const L_EYE_TOP = 386;

// Eyeliner landmarks
const R_EYE_UPPER = [33, 246, 161, 160, 159, 158, 157, 173, 133];
const L_EYE_UPPER = [362, 398, 384, 385, 386, 387, 388, 466, 263];

// Face shape measurement landmarks
const FOREHEAD_TOP = 10;
const CHIN_BOTTOM = 152;
const LEFT_CHEEK = 234;
const RIGHT_CHEEK = 454;
const LEFT_JAW = 172;
const RIGHT_JAW = 397;
const FOREHEAD_LEFT = 109;
const FOREHEAD_RIGHT = 338;

export type BeautyArea = "eyebrow" | "lip" | "eyeliner";
export type FaceShape = "round" | "oval" | "long" | "square" | "heart";

export interface FaceMetrics {
    faceShape: FaceShape;
    faceWidthHeightRatio: number;
    jawWidthRatio: number;
    foreheadWidthRatio: number;
    browThickness: number;
    browAngle: number;
    hasThinBrows: boolean;
    eyeSpacing: number;
    lipThickness: number;
}

export interface StyleRecommendation {
    area: BeautyArea;
    styleId: string;
    styleName: string;
    reasoning: string;
    confidence: number;
}

interface Point { x: number; y: number }

import type { LandmarkData } from "./eyebrow-renderer";

// ─── MediaPipe singleton ────────────────────────────────────────────────────

interface FaceLandmarkerModule {
    FaceLandmarker: {
        createFromModelPath: (vision: unknown, url: string) => Promise<FaceLandmarkerInstance>;
    };
    FaceDetector: {
        createFromModelPath: (vision: unknown, url: string) => Promise<FaceDetectorInstance>;
    };
    FilesetResolver: {
        forVisionTasks: (wasmPath: string) => Promise<unknown>;
    };
}

interface FaceLandmarkerInstance {
    detect: (image: HTMLImageElement) => {
        faceLandmarks?: Array<Array<{ x: number; y: number; z: number }>>;
    };
}

interface FaceDetectorInstance {
    detect: (image: HTMLImageElement) => {
        detections?: Array<{
            boundingBox?: { originX: number; originY: number; width: number; height: number };
        }>;
    };
}


let instance: FaceLandmarkerInstance | null = null;
let detectorInstance: FaceDetectorInstance | null = null;
let loadPromise: Promise<FaceLandmarkerInstance> | null = null;

export async function initFaceAnalysis(): Promise<FaceLandmarkerInstance> {
    if (instance) return instance;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
        const mod = (await import("@mediapipe/tasks-vision")) as unknown as FaceLandmarkerModule;
        const vision = await mod.FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm",
        );
        const [landmarker, detector] = await Promise.all([
            mod.FaceLandmarker.createFromModelPath(
                vision,
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            ),
            mod.FaceDetector.createFromModelPath(
                vision,
                "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.task",
            ),
        ]);
        instance = landmarker;
        detectorInstance = detector;
        return instance;
    })();

    return loadPromise;
}

// ─── Detection & Analysis ───────────────────────────────────────────────────

function px(lm: Array<{ x: number; y: number }>, idx: number, w: number, h: number): Point {
    const p = lm.at(idx);
    return { x: (p?.x ?? 0) * w, y: (p?.y ?? 0) * h };
}

function pxArr(lm: Array<{ x: number; y: number }>, indices: number[], w: number, h: number): Point[] {
    return indices.map((i) => px(lm, i, w, h));
}

function dist(a: Point, b: Point): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function avgDist(upper: Point[], lower: Point[]): number {
    const len = Math.min(upper.length, lower.length);
    let sum = 0;
    for (let i = 0; i < len; i++) {
        const u = upper.at(i);
        const l = lower.at(i);
        if (u && l) sum += dist(u, l);
    }
    return sum / len;
}

function classifyFaceShape(ratio: number, jawRatio: number, foreheadRatio: number): FaceShape {
    if (ratio > 0.85 && jawRatio > 0.85) return "round";
    if (ratio > 0.8 && jawRatio > 0.9) return "square";
    if (foreheadRatio > jawRatio + 0.1) return "heart";
    if (ratio < 0.75) return "long";
    return "oval";
}

function computeMetrics(lm: Array<{ x: number; y: number; z: number }>, w: number, h: number): FaceMetrics {
    const top = px(lm, FOREHEAD_TOP, w, h);
    const bottom = px(lm, CHIN_BOTTOM, w, h);
    const faceHeight = dist(top, bottom);
    const faceWidth = dist(px(lm, LEFT_CHEEK, w, h), px(lm, RIGHT_CHEEK, w, h));
    const jawWidth = dist(px(lm, LEFT_JAW, w, h), px(lm, RIGHT_JAW, w, h));
    const foreheadWidth = dist(px(lm, FOREHEAD_LEFT, w, h), px(lm, FOREHEAD_RIGHT, w, h));

    const faceWidthHeightRatio = faceWidth / faceHeight;
    const jawWidthRatio = jawWidth / faceWidth;
    const foreheadWidthRatio = foreheadWidth / faceWidth;

    const rBrowU = pxArr(lm, R_BROW_UPPER, w, h);
    const rBrowL = pxArr(lm, R_BROW_LOWER, w, h);
    const browThicknessRatio = avgDist(rBrowU, rBrowL) / faceHeight;

    const firstBrow = rBrowU.at(0);
    const lastBrow = rBrowU.at(-1);
    const browAngle = (firstBrow && lastBrow)
        ? Math.atan2(lastBrow.y - firstBrow.y, lastBrow.x - firstBrow.x) * (180 / Math.PI)
        : 0;

    const eyeSpacing = dist(px(lm, 133, w, h), px(lm, 362, w, h)) / faceWidth;
    const lipThickness = avgDist(pxArr(lm, LIP_OUTER_UPPER, w, h), pxArr(lm, LIP_OUTER_LOWER, w, h)) / faceHeight;

    return {
        faceShape: classifyFaceShape(faceWidthHeightRatio, jawWidthRatio, foreheadWidthRatio),
        faceWidthHeightRatio, jawWidthRatio, foreheadWidthRatio,
        browThickness: browThicknessRatio, browAngle,
        hasThinBrows: browThicknessRatio < 0.025,
        eyeSpacing, lipThickness,
    };
}

export function analyzeFace(image: HTMLImageElement): { metrics: FaceMetrics; landmarks: LandmarkData } | null {
    if (!instance) return null;
    const result = instance.detect(image);
    if (!result.faceLandmarks?.length) return null;

    const lm = result.faceLandmarks[0];
    const w = image.naturalWidth;
    const h = image.naturalHeight;

    let boundingBox: LandmarkData["boundingBox"];
    if (detectorInstance) {
        const detResult = detectorInstance.detect(image);
        const det = detResult.detections?.[0];
        if (det?.boundingBox) {
            const bb = det.boundingBox;
            boundingBox = {
                topY: bb.originY,
                bottomY: bb.originY + bb.height,
                leftX: bb.originX,
                rightX: bb.originX + bb.width,
            };
        }
    }

    return {
        metrics: computeMetrics(lm, w, h),
        landmarks: { points: lm, imageWidth: w, imageHeight: h, boundingBox },
    };
}

// ─── Style Recommendations ──────────────────────────────────────────────────

const FACE_SHAPE_KO: Record<FaceShape, string> = {
    round: "둥근형",
    oval: "타원형",
    long: "긴형",
    square: "각진형",
    heart: "하트형",
};

export function recommendStyles(metrics: FaceMetrics): StyleRecommendation[] {
    const results: StyleRecommendation[] = [];
     
    const shapeKo = FACE_SHAPE_KO[metrics.faceShape];

    // Eyebrow recommendation
    const browRec = recommendEyebrow(metrics, shapeKo);
    results.push(browRec);

    // Lip recommendation
    const lipRec = recommendLip(metrics, shapeKo);
    results.push(lipRec);

    // Eyeliner recommendation
    const linerRec = recommendEyeliner(metrics, shapeKo);
    results.push(linerRec);

    return results;
}

function recommendEyebrow(m: FaceMetrics, shapeKo: string): StyleRecommendation {
    const thinNote = m.hasThinBrows ? " 현재 눈썹이 얇아 또렷한 스타일이 효과적입니다." : "";

    switch (m.faceShape) {
        case "round":
            return {
                area: "eyebrow", styleId: "bold-arch", styleName: "볼드 아치",
                reasoning: `${shapeKo} 얼굴에 아치형 눈썹이 세로 길이감을 더해 갸름해 보이는 효과를 줍니다.${thinNote}`,
                confidence: 0.9,
            };
        case "long":
            return {
                area: "eyebrow", styleId: "straight", styleName: "일자 눈썹",
                reasoning: `${shapeKo} 얼굴에 일자형 눈썹이 가로 넓이감을 더해 균형 잡힌 인상을 줍니다.${thinNote}`,
                confidence: 0.9,
            };
        case "square":
            return {
                area: "eyebrow", styleId: "soft-arch", styleName: "소프트 아치",
                reasoning: `${shapeKo} 얼굴에 부드러운 곡선 눈썹이 각진 인상을 부드럽게 완화합니다.${thinNote}`,
                confidence: 0.85,
            };
        case "heart":
            return {
                area: "eyebrow", styleId: "natural-arch", styleName: "자연 아치형",
                reasoning: `${shapeKo} 얼굴에 자연스러운 아치가 넓은 이마와 좁은 턱의 균형을 맞춥니다.${thinNote}`,
                confidence: 0.85,
            };
        default:
            return {
                area: "eyebrow", styleId: "natural-arch", styleName: "자연 아치형",
                reasoning: `${shapeKo} 얼굴은 대부분의 눈썹 스타일이 잘 어울리며, 자연 아치형이 가장 무난합니다.${thinNote}`,
                confidence: 0.8,
            };
    }
}

function recommendLip(m: FaceMetrics, shapeKo: string): StyleRecommendation {
    if (m.lipThickness < 0.04) {
        return {
            area: "lip", styleId: "coral", styleName: "코랄",
            reasoning: `${shapeKo} 얼굴에 따뜻한 코랄 톤이 입술에 볼륨감을 더해줍니다.`,
            confidence: 0.8,
        };
    }
    return {
        area: "lip", styleId: "mlbb", styleName: "MLBB",
        reasoning: `${shapeKo} 얼굴에 자연스러운 MLBB 톤으로 입술을 은은하게 살려줍니다.`,
        confidence: 0.8,
    };
}

function recommendEyeliner(m: FaceMetrics, shapeKo: string): StyleRecommendation {
    if (m.eyeSpacing > 0.38) {
        return {
            area: "eyeliner", styleId: "cat-eye", styleName: "캣 아이",
            reasoning: `${shapeKo} 얼굴, 눈 간격이 넓어 캣아이 라인으로 눈매를 또렷하게 모아줍니다.`,
            confidence: 0.75,
        };
    }
    return {
        area: "eyeliner", styleId: "natural-line", styleName: "내추럴 라인",
        reasoning: `${shapeKo} 얼굴에 자연스러운 속눈썹 라인 강조로 깔끔한 인상을 줍니다.`,
        confidence: 0.75,
    };
}

// ─── Mask Generation ────────────────────────────────────────────────────────

export function generateMask(
    landmarks: LandmarkData,
    area: BeautyArea,
    width: number,
    height: number,
): string {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // Black background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    const lm = landmarks.points;
    const w = landmarks.imageWidth;
    const h = landmarks.imageHeight;
    const scaleX = width / w;
    const scaleY = height / h;

    const toCanvas = (idx: number): Point => {
        const p = lm.at(idx);
        return { x: (p?.x ?? 0) * w * scaleX, y: (p?.y ?? 0) * h * scaleY };
    };

    const toCanvasArr = (indices: number[]): Point[] => indices.map((i) => toCanvas(i));

    ctx.fillStyle = "#ffffff";

    if (area === "eyebrow") {
        // Use eye positions to define ideal brow zone — NOT current brow landmarks
        // This ensures proper mask even when eyebrows are thin/missing
        drawIdealBrowZone(ctx, toCanvas, R_EYE_INNER, R_EYE_OUTER, R_EYE_TOP, FOREHEAD_TOP, width);
        drawIdealBrowZone(ctx, toCanvas, L_EYE_INNER, L_EYE_OUTER, L_EYE_TOP, FOREHEAD_TOP, width);
    } else if (area === "lip") {
        drawRegion(ctx, toCanvasArr(LIP_OUTER_UPPER), toCanvasArr(LIP_OUTER_LOWER));
    } else if (area === "eyeliner") {
        drawThickLine(ctx, toCanvasArr(R_EYE_UPPER), 6);
        drawThickLine(ctx, toCanvasArr(L_EYE_UPPER), 6);
    }

    // Blur mask edges for natural blending
    const blurAmount = Math.max(3, width * 0.01);
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = width;
    tmpCanvas.height = height;
    const tmpCtx = tmpCanvas.getContext("2d");
    if (tmpCtx) {
        tmpCtx.filter = `blur(${String(blurAmount)}px)`;
        tmpCtx.drawImage(canvas, 0, 0);
        // Threshold back to solid mask with soft edges
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(tmpCanvas, 0, 0);
    }

    return canvas.toDataURL("image/png").split(",").at(1) ?? "";
}

/** Draw ideal eyebrow zone based on eye position, not current brow state */
function drawIdealBrowZone(
    ctx: CanvasRenderingContext2D,
    toCanvas: (idx: number) => Point,
    eyeInnerIdx: number, eyeOuterIdx: number, eyeTopIdx: number,
    foreheadIdx: number, canvasWidth: number,
): void {
    const inner = toCanvas(eyeInnerIdx);
    const outer = toCanvas(eyeOuterIdx);
    const eyeTop = toCanvas(eyeTopIdx);
    const forehead = toCanvas(foreheadIdx);

    // Eye width determines brow length
    const eyeW = Math.abs(outer.x - inner.x);
    // Distance from eye top to forehead determines brow zone height
    const browZoneH = Math.abs(eyeTop.y - forehead.y);

    // Ideal brow sits 15-40% of the eye-to-forehead zone above the eye
    const browBottom = eyeTop.y - browZoneH * 0.15;
    const browTop = eyeTop.y - browZoneH * 0.40;
    // Brow thickness: at least 8% of eye width, proportional to face
    const minThickness = eyeW * 0.15;
    const thickness = Math.max(minThickness, Math.abs(browBottom - browTop));

    // Extend brow 15% beyond eye edges for natural proportion
    const extend = eyeW * 0.15;
    const isRight = inner.x > outer.x;
    const xStart = isRight ? outer.x - extend : inner.x - extend;
    const xEnd = isRight ? inner.x + extend : outer.x + extend;

    // Rounded rectangle for natural brow mask shape
    const radius = Math.min(thickness * 0.4, canvasWidth * 0.02);
    const top = browTop;
    const bottom = top + thickness;

    ctx.beginPath();
    ctx.moveTo(xStart + radius, top);
    ctx.lineTo(xEnd - radius, top);
    ctx.quadraticCurveTo(xEnd, top, xEnd, top + radius);
    ctx.lineTo(xEnd, bottom - radius);
    ctx.quadraticCurveTo(xEnd, bottom, xEnd - radius, bottom);
    ctx.lineTo(xStart + radius, bottom);
    ctx.quadraticCurveTo(xStart, bottom, xStart, bottom - radius);
    ctx.lineTo(xStart, top + radius);
    ctx.quadraticCurveTo(xStart, top, xStart + radius, top);
    ctx.closePath();
    ctx.fill();
}

function drawRegion(ctx: CanvasRenderingContext2D, upper: Point[], lower: Point[]): void {
    ctx.beginPath();
    const first = upper.at(0);
    if (!first) return;
    ctx.moveTo(first.x, first.y);
    for (const p of upper) ctx.lineTo(p.x, p.y);
    const revLower = [...lower].reverse();
    for (const p of revLower) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fill();
}

function drawThickLine(ctx: CanvasRenderingContext2D, pts: Point[], thickness: number): void {
    ctx.beginPath();
    const first = pts.at(0);
    if (!first) return;
    ctx.moveTo(first.x, first.y);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = thickness;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
}

/** Load image from URL (supports cross-origin for Supabase Storage) */
export function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}
