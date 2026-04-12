/**
 * POST /api/ai/style
 *
 * Image-to-image style transfer for tattoo designs.
 * Uses ComfyUI FLUX img2img pipeline.
 */

import { NextRequest, NextResponse } from "next/server";
import { COMFYUI_URL } from "@/lib/ai-client";
import { queuePrompt, pollForImage } from "@/lib/comfyui";

/** Allow up to 300s for ComfyUI style transfer */
export const maxDuration = 300;

const STYLE_PROMPTS: Record<string, string> = {
    minimal: "minimalist fine-line tattoo, single needle, thin clean lines, simple elegant design",
    blackwork: "bold blackwork tattoo, solid black ink, heavy contrast, graphic design",
    watercolor: "watercolor tattoo, soft paint splashes, color blending, artistic",
    traditional: "American traditional tattoo, bold outlines, limited palette, classic flash",
    realism: "photorealistic tattoo, detailed shading, lifelike rendering",
    japanese: "Japanese irezumi, bold outlines, waves and clouds, traditional motifs",
    geometric: "geometric tattoo, sacred geometry, precise mathematical patterns",
    dotwork: "dotwork stipple tattoo, pointillism, intricate dot shading",
};

export async function POST(request: NextRequest): Promise<NextResponse> {
    if (!COMFYUI_URL) {
        return NextResponse.json({ error: "ComfyUI not configured" }, { status: 503 });
    }

    try {
        const { image, style = "minimal", strength = 0.7 } = await request.json();

        if (!image) {
            return NextResponse.json({ error: "image required" }, { status: 400 });
        }

        // eslint-disable-next-line security/detect-object-injection -- Safe: known key lookup
        const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.minimal;
        const prompt = `${stylePrompt}, tattoo design, high quality, sharp details, white background`;
        const denoise = Math.min(Math.max(strength as number, 0.3), 0.95);

        const promptId = await queuePrompt(buildWorkflow(prompt, image, denoise));
        const imageData = await pollForImage(promptId);

        if (!imageData) {
            return NextResponse.json({ error: "Generation timed out" }, { status: 504 });
        }

        return NextResponse.json({ image: imageData, style });
    } catch (error) {
        // eslint-disable-next-line no-console -- Server-side error logging
        console.error("[AI/style] Error:", error);
        return NextResponse.json({ error: "Style transfer failed" }, { status: 500 });
    }
}

function buildWorkflow(prompt: string, imageBase64: string, denoise: number): Record<string, unknown> {
    return {
        "1": { class_type: "DualCLIPLoader", inputs: { clip_name1: "clip_l.safetensors", clip_name2: "t5xxl_fp16.safetensors", type: "flux" } },
        "2": { class_type: "CLIPTextEncode", inputs: { text: prompt, clip: ["1", 0] } },
        "3": { class_type: "UNETLoader", inputs: { unet_name: "flux1-dev-fp8-e4m3fn.safetensors", weight_dtype: "fp8_e4m3fn" } },
        "4": { class_type: "ETN_LoadImageBase64", inputs: { image: imageBase64 } },
        "5": { class_type: "VAELoader", inputs: { vae_name: "flux_vae.safetensors" } },
        "6": { class_type: "VAEEncode", inputs: { pixels: ["4", 0], vae: ["5", 0] } },
        "7": { class_type: "KSampler", inputs: { model: ["3", 0], positive: ["2", 0], negative: ["8", 0], latent_image: ["6", 0], seed: crypto.getRandomValues(new Uint32Array(1))[0], steps: 20, cfg: 1.0, sampler_name: "euler", scheduler: "simple", denoise } },
        "8": { class_type: "CLIPTextEncode", inputs: { text: "", clip: ["1", 0] } },
        "9": { class_type: "VAEDecode", inputs: { samples: ["7", 0], vae: ["5", 0] } },
        "10": { class_type: "SaveImage", inputs: { images: ["9", 0], filename_prefix: "style" } },
    };
}
