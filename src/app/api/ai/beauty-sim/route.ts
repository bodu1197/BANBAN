/**
 * POST /api/ai/beauty-sim
 *
 * AI-powered semi-permanent makeup simulation using FLUX.1 Fill [dev].
 * Purpose-built inpainting model: regenerates ONLY the masked area,
 * preserving 100% identity outside the mask.
 *
 * Flow: Face photo + mask + area + style → FLUX Fill inpaint → return result
 */

import { NextRequest, NextResponse } from "next/server";
import { COMFYUI_URL } from "@/lib/ai-client";
import { queuePrompt, pollForImage } from "@/lib/comfyui";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

/** Allow up to 300s for FLUX Fill generation */
export const maxDuration = 300;

// ─── Types ──────────────────────────────────────────────────────────────────

type BeautyArea = "eyebrow" | "lip" | "eyeliner";

interface BeautySimRequest {
    image: string;
    mask: string;
    area: BeautyArea;
    style: string;
}

const VALID_AREAS = new Set<BeautyArea>(["eyebrow", "lip", "eyeliner"]);

// ─── Style Prompts ──────────────────────────────────────────────────────────

const EYEBROW_STYLES: Record<string, string> = {
    "natural-arch": "natural arch eyebrows with soft powder brow finish, semi-permanent makeup, gentle natural curve with gradient shading from light inner brow to defined tail",
    "straight": "straight Korean-style eyebrows, even thickness throughout, natural powder finish, semi-permanent flat brow with soft edges",
    "soft-arch": "softly arched eyebrows, gentle subtle curve, ombre powder brow effect, semi-permanent makeup with natural gradient",
    "bold-arch": "bold defined arched eyebrows, strong shape with crisp edges, microblading hair-stroke pattern, semi-permanent makeup",
    "feathered": "feathered natural eyebrows with realistic individual hair strokes, microblading semi-permanent makeup, wispy natural brow hairs",
};

const LIP_STYLES: Record<string, string> = {
    "natural-pink": "natural pink gradient lips, semi-permanent lip blush, soft ombre effect from center to edges, healthy natural pink tint",
    "coral": "coral toned lip blush, warm peachy pink, semi-permanent lip tint, gradient ombre from vivid center to soft edges",
    "rose": "rose pink lip color, semi-permanent lip tattoo, even full coverage with natural-looking color",
    "mlbb": "my-lips-but-better natural lip enhancement, subtle color correction, semi-permanent lip blush barely noticeable enhancement",
    "brick-red": "brick red lip color, semi-permanent lip tattoo, matte finish warm red-brown tone",
};

const EYELINER_STYLES: Record<string, string> = {
    "natural-line": "thin natural eyeliner, subtle lash line enhancement, semi-permanent eyeliner tattoo, barely visible thin line along lashes",
    "puppy-line": "puppy eye eyeliner with slight downward tail, soft brown semi-permanent eyeliner, cute droopy eye effect",
    "cat-eye": "cat eye eyeliner with subtle wing, clean sharp line, semi-permanent eyeliner with small flick at outer corner",
    "lash-line": "invisible lash line eyeliner, between-lash fill, semi-permanent eyeliner that only fills gaps between lashes",
};

function getStylePrompt(area: BeautyArea, style: string): string {
    const AREA_STYLE_MAP: Record<BeautyArea, Record<string, string>> = {
        eyebrow: EYEBROW_STYLES,
        lip: LIP_STYLES,
        eyeliner: EYELINER_STYLES,
    };
    // eslint-disable-next-line security/detect-object-injection -- Safe: area is validated from VALID_AREAS set
    const styles = AREA_STYLE_MAP[area];
    // eslint-disable-next-line security/detect-object-injection -- Safe: style is user-selected from known list
    return styles[style] || Object.values(styles)[0];
}

// ─── FLUX Fill [dev] Workflow ───────────────────────────────────────────────

const CLIP_LOADER = {
    class_type: "DualCLIPLoader",
    inputs: { clip_name1: "clip_l.safetensors", clip_name2: "t5xxl_fp16.safetensors", type: "flux" },
} as const;

const FILL_UNET_LOADER = {
    class_type: "UNETLoader",
    inputs: { unet_name: "flux1-fill-dev-fp8.safetensors", weight_dtype: "fp8_e4m3fn" },
} as const;

const VAE_LOADER = {
    class_type: "VAELoader",
    inputs: { vae_name: "flux_vae.safetensors" },
} as const;

function buildBeautySimWorkflow(
    faceImage: string,
    mask: string,
    area: BeautyArea,
    style: string,
): Record<string, unknown> {
    const styleDesc = getStylePrompt(area, style);

    const editPrompt = `${styleDesc}. `
        + `Professional semi-permanent makeup on real skin, healed and natural-looking. `
        + `Realistic skin texture, photorealistic.`;

    return {
        "1": CLIP_LOADER,
        "3": FILL_UNET_LOADER,
        "7": VAE_LOADER,
        "2": { class_type: "CLIPTextEncode", inputs: { text: editPrompt, clip: ["1", 0] } },
        "6": { class_type: "CLIPTextEncode", inputs: { text: "", clip: ["1", 0] } },
        "11": { class_type: "ETN_LoadImageBase64", inputs: { image: faceImage } },
        "12": { class_type: "ETN_LoadMaskBase64", inputs: { mask } },
        "15": {
            class_type: "InpaintModelConditioning",
            inputs: {
                positive: ["2", 0],
                negative: ["6", 0],
                vae: ["7", 0],
                pixels: ["11", 0],
                mask: ["12", 0],
                noise_mask: true,
            },
        },
        "5": {
            class_type: "KSampler",
            inputs: {
                model: ["3", 0],
                positive: ["15", 0],
                negative: ["15", 1],
                latent_image: ["15", 2],
                seed: crypto.getRandomValues(new Uint32Array(1))[0],
                steps: 28,
                cfg: 1.0,
                sampler_name: "euler",
                scheduler: "simple",
                denoise: 1.0,
            },
        },
        "8": { class_type: "VAEDecode", inputs: { samples: ["5", 0], vae: ["7", 0] } },
        "9": { class_type: "SaveImage", inputs: { images: ["8", 0], filename_prefix: "beauty_sim" } },
    };
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateRequest(body: BeautySimRequest): NextResponse | null {
    const { image, mask, area, style } = body;
    if (!image || !mask || !area || !style) {
        return NextResponse.json({ error: "image, mask, area, and style are required" }, { status: 400 });
    }
    if (!VALID_AREAS.has(area)) {
        return NextResponse.json({ error: `Invalid area: ${area}` }, { status: 400 });
    }
    return null;
}

// ─── Pre-checks ─────────────────────────────────────────────────────────────

async function checkRateLimit(request: NextRequest): Promise<NextResponse | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const rateLimitKey = `beauty-sim:${user?.id ?? getClientIp(request)}`;
    const { success } = rateLimit({ key: rateLimitKey, limit: 10, windowMs: 60_000 });
    if (!success) return rateLimitResponse() as NextResponse;
    return null;
}

async function generateBeautySim(body: BeautySimRequest): Promise<NextResponse> {
    const workflow = buildBeautySimWorkflow(body.image, body.mask, body.area, body.style);
    const promptId = await queuePrompt(workflow);
    const imageData = await pollForImage(promptId, 180000);

    if (!imageData) {
        return NextResponse.json({ error: "Generation timed out" }, { status: 504 });
    }

    return NextResponse.json({ image: imageData, area: body.area, style: body.style });
}

// ─── Handler ────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
    if (!COMFYUI_URL) {
        return NextResponse.json({ error: "ComfyUI not configured" }, { status: 503 });
    }

    const rateLimited = await checkRateLimit(request);
    if (rateLimited) return rateLimited;

    try {
        const body = (await request.json()) as BeautySimRequest;
        const validationError = validateRequest(body);
        if (validationError) return validationError;

        return await generateBeautySim(body);
    } catch (error) {
        // eslint-disable-next-line no-console -- Server-side error logging
        console.error("[AI/beauty-sim] Error:", error);
        return NextResponse.json({ error: "Beauty simulation failed" }, { status: 500 });
    }
}
