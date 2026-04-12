/**
 * POST /api/ai/mask
 *
 * SAM2 body part mask generation.
 * User clicks on body part -> returns precise segmentation mask.
 */

import { NextRequest, NextResponse } from "next/server";
import { SAM2_URL } from "@/lib/ai-client";

export async function POST(request: NextRequest): Promise<NextResponse> {
    if (!SAM2_URL) {
        return NextResponse.json({ error: "SAM2 not configured" }, { status: 503 });
    }

    try {
        const formData = await request.formData();
        const imageFile = formData.get("image") as File | null;
        const pointsStr = formData.get("points") as string | null;
        const labelsStr = formData.get("labels") as string | null;

        if (!imageFile || !pointsStr) {
            return NextResponse.json({ error: "image file and points required" }, { status: 400 });
        }

        // Forward to SAM2 server as multipart form
        const sam2Form = new FormData();
        sam2Form.append("image", imageFile);
        sam2Form.append("points", pointsStr);
        if (labelsStr) {
            sam2Form.append("labels", labelsStr);
        }

        const res = await fetch(`${SAM2_URL}/segment`, {
            method: "POST",
            body: sam2Form,
            signal: AbortSignal.timeout(30000),
        });

        if (!res.ok) {
            // eslint-disable-next-line no-console -- Server-side error logging
            console.error("[AI/mask] SAM2 error:", await res.text());
            return NextResponse.json({ error: "Mask generation failed" }, { status: 502 });
        }

        return NextResponse.json(await res.json());
    } catch (error) {
        // eslint-disable-next-line no-console -- Server-side error logging
        console.error("[AI/mask] Error:", error);
        return NextResponse.json({ error: "Mask generation failed" }, { status: 500 });
    }
}
