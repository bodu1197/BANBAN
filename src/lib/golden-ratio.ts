/**
 * Golden Ratio Analysis — AI-based facial proportion measurement for pro consultation.
 *
 * Uses MediaPipe landmarks to compute ideal proportions and deviation scores.
 * Based on the neoclassical canons of facial beauty (1:1.618 golden ratio).
 */

// ─── Landmark Indices ───────────────────────────────────────────────────────

const FOREHEAD_TOP = 10;
const CHIN_BOTTOM = 152;
const NOSE_TIP = 1;
const NOSE_BRIDGE = 6;
const LEFT_CHEEK = 234;
const RIGHT_CHEEK = 454;
const R_EYE_INNER = 133;
const L_EYE_INNER = 362;
const R_EYE_OUTER = 33;
const L_EYE_OUTER = 263;
const UPPER_LIP_TOP = 0;
const LOWER_LIP_BOTTOM = 17;

// ─── Types ──────────────────────────────────────────────────────────────────

interface Point { x: number; y: number }

export interface RatioMeasurement {
    label: string;
    actual: number;
    ideal: number;
    deviation: number; // % deviation from ideal
    rating: "excellent" | "good" | "fair";
}

export interface GoldenRatioResult {
    overallScore: number; // 0-100
    measurements: RatioMeasurement[];
    guideLines: GuideLine[];
}

export interface GuideLine {
    label: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    color: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function lmPx(lm: Array<{ x: number; y: number }>, idx: number, w: number, h: number): Point {
    const p = lm.at(idx);
    return { x: (p?.x ?? 0) * w, y: (p?.y ?? 0) * h };
}

function dist(a: Point, b: Point): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function rateDeviation(deviation: number): "excellent" | "good" | "fair" {
    if (deviation < 5) return "excellent";
    if (deviation < 15) return "good";
    return "fair";
}

// ─── Golden Ratio Computation ───────────────────────────────────────────────

const GOLDEN_RATIO = 1.618;

interface FaceLandmarks {
    forehead: Point; chin: Point; noseTip: Point; noseBridge: Point;
    leftCheek: Point; rightCheek: Point;
    rEyeInner: Point; lEyeInner: Point; rEyeOuter: Point; lEyeOuter: Point;
    upperLip: Point; lowerLip: Point;
}

function extractFaceLandmarks(lm: Array<{ x: number; y: number }>, w: number, h: number): FaceLandmarks {
    return {
        forehead: lmPx(lm, FOREHEAD_TOP, w, h),
        chin: lmPx(lm, CHIN_BOTTOM, w, h),
        noseTip: lmPx(lm, NOSE_TIP, w, h),
        noseBridge: lmPx(lm, NOSE_BRIDGE, w, h),
        leftCheek: lmPx(lm, LEFT_CHEEK, w, h),
        rightCheek: lmPx(lm, RIGHT_CHEEK, w, h),
        rEyeInner: lmPx(lm, R_EYE_INNER, w, h),
        lEyeInner: lmPx(lm, L_EYE_INNER, w, h),
        rEyeOuter: lmPx(lm, R_EYE_OUTER, w, h),
        lEyeOuter: lmPx(lm, L_EYE_OUTER, w, h),
        upperLip: lmPx(lm, UPPER_LIP_TOP, w, h),
        lowerLip: lmPx(lm, LOWER_LIP_BOTTOM, w, h),
    };
}

function measureRatio(label: string, actual: number, ideal: number): RatioMeasurement {
    const deviation = Math.abs(actual - ideal) / ideal * 100;
    return { label, actual: Math.round(actual * 100) / 100, ideal, deviation: Math.round(deviation), rating: rateDeviation(deviation) };
}

function computeMeasurements(
    fl: FaceLandmarks,
    lm: Array<{ x: number; y: number }>,
    w: number, h: number,
): RatioMeasurement[] {
    const faceHeight = dist(fl.forehead, fl.chin);
    const faceWidth = dist(fl.leftCheek, fl.rightCheek);
    const eyeWidth = dist(fl.rEyeOuter, fl.rEyeInner);
    const eyeSpacing = dist(fl.rEyeInner, fl.lEyeInner);

    const foreheadToNose = dist(fl.forehead, fl.noseBridge);
    const midSection = dist(fl.noseBridge, fl.noseTip) + dist(fl.noseTip, fl.upperLip);
    const lowerSection = dist(fl.lowerLip, fl.chin);
    const triAvg = ((foreheadToNose / midSection) + (midSection / lowerSection)) / 2;
    const triDev = (Math.abs(foreheadToNose / midSection - 1) + Math.abs(midSection / lowerSection - 1)) / 2 * 100;

    const noseWidth = dist(lmPx(lm, 48, w, h), lmPx(lm, 278, w, h));

    return [
        measureRatio("얼굴 세로:가로", faceHeight / faceWidth, GOLDEN_RATIO),
        { label: "3등분 균형", actual: Math.round(triAvg * 100) / 100, ideal: 1.0, deviation: Math.round(triDev), rating: rateDeviation(triDev) },
        measureRatio("눈 간격", eyeSpacing / eyeWidth, 1.0),
        measureRatio("코 너비:눈 간격", noseWidth / eyeSpacing, 1.0),
        measureRatio("입술-턱 비율", dist(fl.upperLip, fl.chin) / dist(fl.noseTip, fl.upperLip), GOLDEN_RATIO),
    ];
}

function computeGuideLines(fl: FaceLandmarks): GuideLine[] {
    const faceHeight = dist(fl.forehead, fl.chin);
    const browIdealY = fl.forehead.y + faceHeight * 0.33;

    return [
        { label: "얼굴 높이", startX: fl.forehead.x, startY: fl.forehead.y, endX: fl.chin.x, endY: fl.chin.y, color: "#f472b6" },
        { label: "얼굴 너비", startX: fl.leftCheek.x, startY: fl.leftCheek.y, endX: fl.rightCheek.x, endY: fl.rightCheek.y, color: "#60a5fa" },
        { label: "눈 간격", startX: fl.rEyeInner.x, startY: fl.rEyeInner.y, endX: fl.lEyeInner.x, endY: fl.lEyeInner.y, color: "#a78bfa" },
        { label: "이상적 눈썹 위치", startX: fl.rEyeOuter.x - 10, startY: browIdealY, endX: fl.lEyeOuter.x + 10, endY: browIdealY, color: "#fb923c" },
    ];
}

export function computeGoldenRatio(
    lm: Array<{ x: number; y: number }>,
    w: number, h: number,
): GoldenRatioResult {
    const fl = extractFaceLandmarks(lm, w, h);
    const measurements = computeMeasurements(fl, lm, w, h);
    const guideLines = computeGuideLines(fl);

    const avgDev = measurements.reduce((sum, m) => sum + m.deviation, 0) / measurements.length;
    const overallScore = Math.max(0, Math.min(100, Math.round(100 - avgDev)));

    return { overallScore, measurements, guideLines };
}
