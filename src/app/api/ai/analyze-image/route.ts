/**
 * POST /api/ai/analyze-image
 *
 * Analyze an uploaded image using Qwen2.5-VL vision model
 * and generate a tattoo design prompt from it.
 */

import { NextRequest, NextResponse } from "next/server";
import { VISION_URL } from "@/lib/ai-client";

const MAX_BASE64_SIZE = 10 * 1024 * 1024; // ~10MB

export async function POST(request: NextRequest): Promise<NextResponse> {
    if (!VISION_URL) {
        return NextResponse.json({ error: "Vision AI not configured" }, { status: 503 });
    }

    try {
        const { image } = await request.json();

        if (!image || typeof image !== "string") {
            return NextResponse.json({ error: "image (base64) required" }, { status: 400 });
        }
        if (image.length > MAX_BASE64_SIZE) {
            return NextResponse.json({ error: "Image too large" }, { status: 400 });
        }

        const res = await fetch(`${VISION_URL}/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image }),
            signal: AbortSignal.timeout(60000),
        });

        if (!res.ok) {
            const err = await res.text().catch(() => "Vision analysis failed");
            // eslint-disable-next-line no-console -- Server-side error logging
            console.error("[AI/analyze-image] Vision server error:", err);
            return NextResponse.json({ error: "Analysis failed" }, { status: 502 });
        }

        const data = await res.json();
        return NextResponse.json({ prompt: data.prompt, style: data.style });
    } catch (error) {
        // eslint-disable-next-line no-console -- Server-side error logging
        console.error("[AI/analyze-image] Error:", error);
        return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
    }
}
