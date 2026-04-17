/**
 * POST /api/ai/eyebrow-remove
 *
 * AI-powered eyebrow erasure using FLUX.1 Fill [dev] inpainting.
 * Replaces masked eyebrow area with clean skin, preserving the
 * original forehead tone and texture around it.
 *
 * Flow: face photo + eyebrow-zone mask → FLUX Fill inpaint → bare-skin base
 *
 * Body: { image: base64, mask: base64 }
 */

import { NextRequest, NextResponse } from "next/server";
import { COMFYUI_URL } from "@/lib/ai-client";
import { queuePrompt, pollForImage } from "@/lib/comfyui";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

/** FLUX Fill inpainting can take up to ~3 minutes on cold GPU */
export const maxDuration = 300;

interface EyebrowRemoveRequest {
    image: string;
    mask: string;
}

const ERASE_POSITIVE = [
    "clean bare forehead skin with no eyebrows at all,",
    "completely smooth skin where eyebrows used to be,",
    "natural skin texture matching surrounding forehead tone,",
    "seamless blend with the face, photorealistic pores,",
    "uniform lighting, high detail skin",
].join(" ");

const ERASE_NEGATIVE = [
    "eyebrows, brow hair, hair strokes, stubble, shadow of eyebrows,",
    "dark patch, discoloration, makeup, tattoo, drawn brows,",
    "asymmetry, blur, artifacts",
].join(" ");

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

function buildEraseWorkflow(faceImage: string, mask: string): Record<string, unknown> {
    return {
        "1": CLIP_LOADER,
        "3": FILL_UNET_LOADER,
        "7": VAE_LOADER,
        "2": { class_type: "CLIPTextEncode", inputs: { text: ERASE_POSITIVE, clip: ["1", 0] } },
        "6": { class_type: "CLIPTextEncode", inputs: { text: ERASE_NEGATIVE, clip: ["1", 0] } },
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
        "9": { class_type: "SaveImage", inputs: { images: ["8", 0], filename_prefix: "eyebrow_remove" } },
    };
}

async function checkRateLimit(request: NextRequest): Promise<NextResponse | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const key = `eyebrow-remove:${user?.id ?? getClientIp(request)}`;
    const { success } = rateLimit({ key, limit: 10, windowMs: 60_000 });
    if (!success) return rateLimitResponse() as NextResponse;
    return null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    if (!COMFYUI_URL) {
        return NextResponse.json({ error: "ComfyUI not configured" }, { status: 503 });
    }

    const rateLimited = await checkRateLimit(request);
    if (rateLimited) return rateLimited;

    try {
        const body = (await request.json()) as EyebrowRemoveRequest;
        if (!body.image || !body.mask) {
            return NextResponse.json({ error: "image and mask are required" }, { status: 400 });
        }

        const workflow = buildEraseWorkflow(body.image, body.mask);
        const promptId = await queuePrompt(workflow);
        const imageData = await pollForImage(promptId, 180000);

        if (!imageData) {
            return NextResponse.json({ error: "Generation timed out" }, { status: 504 });
        }

        return NextResponse.json({ image: imageData });
    } catch (error) {
        // eslint-disable-next-line no-console -- Server-side error logging
        console.error("[AI/eyebrow-remove] Error:", error);
        return NextResponse.json({ error: "Eyebrow removal failed" }, { status: 500 });
    }
}
