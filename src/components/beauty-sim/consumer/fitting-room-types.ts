/**
 * Types, constants, and helpers for the FittingRoom component.
 */

import type { AdjustmentParams, LandmarkData } from "@/lib/eyebrow-renderer";
import { computePlacement, R_EYE_INNER, R_EYE_OUTER, R_EYE_TOP } from "@/lib/eyebrow-renderer";
import type { LipParams } from "@/lib/lip-renderer";

// ─── Types ──────────────────────────────────────────────────────────────────

export type MainTab = "brow" | "lip";
export type BrowSubTab = "shape" | "adjust" | "color" | "exclude";
export type LipSubTab = "color" | "saturation" | "exclude";

/**
 * BrowSide represents SCREEN position (viewer perspective):
 *   "left"  = screen left  = person's RIGHT brow = rightAdj in renderer
 *   "right" = screen right = person's LEFT brow  = leftAdj in renderer
 *   "both"  = both brows
 */
export type BrowSide = "left" | "right" | "both";

// ─── Constants ──────────────────────────────────────────────────────────────

export const INACTIVE_TAB = "bg-white/10 text-white/60 hover:bg-white/20 focus-visible:bg-white/20";

// PreView default: opacity 50% (진하기 50%)
export const DEFAULT_ADJ: AdjustmentParams = { scaleX: 1.0, scaleY: 1.0, angleOffset: 0, opacity: 0.5, offsetX: 0, offsetY: 0 };
export const DEFAULT_LIP: LipParams = { color: "#c45c6a", saturation: 55 };

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Compute initial Y offset proportional to face size (brow-to-forehead distance).
 * Places strokes above natural brows to hint at draggability.
 * ~30% of brow zone height — works for both 800px and 2048px canvases.
 */
export function computeInitialOffsetY(landmarks: LandmarkData, canvasW: number, canvasH: number): number {
    const lm = landmarks.points;
    const rBrow = computePlacement(lm, canvasW, canvasH, R_EYE_INNER, R_EYE_OUTER, R_EYE_TOP, true);
    return -(rBrow.thickness * 1.2);
}

/**
 * Map screen-position side to renderer adjustment params.
 * Screen left = person's right (rightAdj), Screen right = person's left (leftAdj).
 */
export function getActiveAdj(side: BrowSide, leftAdj: AdjustmentParams, rightAdj: AdjustmentParams): AdjustmentParams {
    if (side === "left") return rightAdj;   // screen left → person's right
    if (side === "right") return leftAdj;   // screen right → person's left
    return leftAdj; // "both" — show left as representative
}
