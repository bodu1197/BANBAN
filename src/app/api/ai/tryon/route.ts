/**
 * POST /api/ai/tryon
 *
 * Tattoo body application (virtual try-on).
 *
 * Kontext flow (primary): Uses FLUX Kontext to place a generated tattoo design
 * onto a photorealistic body part. The design image is passed as a reference,
 * and Kontext composites it naturally following skin contours.
 *
 * Txt2img flow (fallback): When no design image is provided ("direct apply"),
 * generates a photorealistic body part photo with the tattoo from prompt only.
 *
 * Legacy flow: composite+inpaint for upload-based body photos.
 */

import { NextRequest, NextResponse } from "next/server";
import { COMFYUI_URL } from "@/lib/ai-client";
import { queuePrompt, pollForImage } from "@/lib/comfyui";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

/** Allow up to 300s for ComfyUI image generation */
export const maxDuration = 300;

const STYLE_PROMPTS: Record<string, string> = {
    minimal: "minimalist fine-line tattoo, single needle, delicate thin lines",
    blackwork: "bold blackwork tattoo, solid black ink, heavy contrast",
    watercolor: "watercolor tattoo, soft color splashes, vibrant hues",
    traditional: "American traditional tattoo, bold outlines, limited color palette",
    realism: "photorealistic tattoo, detailed shading, hyper-realistic",
    japanese: "Japanese irezumi tattoo, bold lines, vibrant colors",
    geometric: "geometric tattoo, sacred geometry, precise lines",
    dotwork: "dotwork stipple tattoo, pointillism, intricate dot patterns",
};

export async function POST(request: NextRequest): Promise<NextResponse> {
    if (!COMFYUI_URL) {
        return NextResponse.json({ error: "ComfyUI not configured" }, { status: 503 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const rateLimitKey = `tryon:${user?.id ?? getClientIp(request)}`;
    const { success } = rateLimit({ key: rateLimitKey, limit: 10, windowMs: 60_000 });
    if (!success) return rateLimitResponse() as NextResponse;

    try {
        const body = await request.json();
        const { tattooImage, prompt } = body;

        const workflow = await buildWorkflowFromBody(body, tattooImage, prompt);
        if (!workflow) {
            return NextResponse.json({ error: "bodyPart or bodyImage+mask required" }, { status: 400 });
        }

        const promptId = await queuePrompt(workflow);
        const imageData = await pollForImage(promptId, 180000);

        if (!imageData) {
            return NextResponse.json({ error: "Generation timed out" }, { status: 504 });
        }
        return NextResponse.json({ image: imageData });
    } catch (error) {
        // eslint-disable-next-line no-console -- Server-side error logging
        console.error("[AI/tryon] Error:", error);
        return NextResponse.json({ error: "Try-on failed" }, { status: 500 });
    }
}

/** Shared loader nodes */
const CLIP_LOADER_NODE = {
    class_type: "DualCLIPLoader",
    inputs: { clip_name1: "clip_l.safetensors", clip_name2: "t5xxl_fp16.safetensors", type: "flux" },
} as const;

/** FLUX.1-dev for txt2img fallback */
const UNET_LOADER_NODE = {
    class_type: "UNETLoader",
    inputs: { unet_name: "flux1-dev-fp8-e4m3fn.safetensors", weight_dtype: "fp8_e4m3fn" },
} as const;

/** FLUX Kontext for reference-based try-on (primary) */
const KONTEXT_LOADER_NODE = {
    class_type: "UNETLoader",
    inputs: { unet_name: "flux1-dev-kontext_fp8_scaled.safetensors", weight_dtype: "fp8_e4m3fn" },
} as const;

const VAE_LOADER_NODE = {
    class_type: "VAELoader",
    inputs: { vae_name: "flux_vae.safetensors" },
} as const;

function randomSeed(): number {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0];
}

function clipEncode(text: string, clipRef: [string, number] = ["1", 0]): { class_type: string; inputs: { text: string; clip: [string, number] } } {
    return { class_type: "CLIPTextEncode", inputs: { text, clip: clipRef } };
}

async function buildWorkflowFromBody(
    body: Record<string, unknown>,
    tattooImage: string,
    prompt?: string
): Promise<Record<string, unknown> | null> {
    if (body.bodyPart) {
        const partName = body.bodyPart as string;
        const styleName = (body.style as string) || "minimal";
        const originalPrompt = (body.originalPrompt as string) || prompt || "tattoo design";

        // Primary: Kontext with reference design image (best quality)
        if (tattooImage) {
            return buildKontextWorkflow(tattooImage, styleName, partName);
        }
        // Fallback: txt2img when no design image ("direct apply")
        return buildBodyPartWorkflow(originalPrompt, styleName, partName);
    }
    // Legacy flow: bodyImage + tattooImage + mask (upload-based)
    const { bodyImage, mask } = body as { bodyImage?: string; mask?: string };
    if (!bodyImage || !tattooImage || !mask) return null;
    return buildTryonWorkflow(bodyImage, tattooImage, mask, prompt);
}

/** Body part key → English description for FLUX prompt */
const BODY_PART_EN: Record<string, string> = {
    "full-arm-left": "full left arm sleeve",
    "full-arm-right": "full right arm sleeve",
    "forearm-left": "left forearm",
    "forearm-right": "right forearm",
    "wrist": "wrist",
    "hand": "hand",
    "full-back": "full back",
    "upper-back": "upper back",
    "lower-back": "lower back",
    "chest": "chest",
    "shoulder": "shoulder",
    "neck": "neck",
    "full-leg-left": "full left leg",
    "full-leg-right": "full right leg",
    "thigh": "thigh",
    "calf": "calf",
    "ankle": "ankle",
    "ribs": "ribs and side torso",
    "belly": "belly and stomach",
};

/**
 * Kontext workflow: Reference-based try-on (primary, best quality).
 * Uses FLUX Kontext to place the generated tattoo design onto a photorealistic body part.
 * The design image is encoded as a reference latent — Kontext composites it naturally
 * following skin contours, lighting, and texture without LoRA.
 */
function buildKontextWorkflow(
    tattooImage: string,
    style: string,
    bodyPart: string
): Record<string, unknown> {
    // eslint-disable-next-line security/detect-object-injection -- Safe: known key lookup
    const bodyPartEn = BODY_PART_EN[bodyPart] || bodyPart;
    // eslint-disable-next-line security/detect-object-injection -- Safe: known key lookup
    const styleDesc = STYLE_PROMPTS[style] || STYLE_PROMPTS.minimal;

    const kontextPrompt = `place this tattoo on the ${bodyPartEn}. `
        + `${styleDesc} permanently inked into real human skin. `
        + `Healed tattoo ink embedded deep in the dermis layer. `
        + `Visible skin pores and fine body hair showing through the faded ink. `
        + `No glow, no halo, no sticker effect. The tattoo edges blend naturally where ink diffuses into bare skin. `
        + `The tattoo follows the natural curves of the ${bodyPartEn}, conforming to muscles and bone structure. `
        + `Professional tattoo photography, natural skin tone, photorealistic.`;

    return {
        "1": CLIP_LOADER_NODE,
        "2": clipEncode(kontextPrompt),
        "3": KONTEXT_LOADER_NODE,
        "7": VAE_LOADER_NODE,
        // Load tattoo design as reference image
        "11": { class_type: "ETN_LoadImageBase64", inputs: { image: tattooImage } },
        // Scale for Kontext optimal size
        "12": { class_type: "FluxKontextImageScale", inputs: { image: ["11", 0] } },
        // Encode reference to latent
        "13": { class_type: "VAEEncode", inputs: { pixels: ["12", 0], vae: ["7", 0] } },
        // Set reference latent on conditioning
        "14": { class_type: "ReferenceLatent", inputs: { conditioning: ["2", 0], latent: ["13", 0] } },
        // Empty latent for generation
        "4": { class_type: "EmptySD3LatentImage", inputs: { width: 1024, height: 1024, batch_size: 1 } },
        // Empty negative
        "6": clipEncode(""),
        "5": {
            class_type: "KSampler",
            inputs: {
                model: ["3", 0], positive: ["14", 0], negative: ["6", 0],
                latent_image: ["4", 0], seed: randomSeed(),
                steps: 28, cfg: 3.5, sampler_name: "euler", scheduler: "simple", denoise: 1,
            },
        },
        "8": { class_type: "VAEDecode", inputs: { samples: ["5", 0], vae: ["7", 0] } },
        "9": { class_type: "SaveImage", inputs: { images: ["8", 0], filename_prefix: "tryon_kontext" } },
    };
}

/**
 * Txt2img body part workflow (fallback for "direct apply" — no design image).
 * Generates a photorealistic photograph of the body part WITH the tattoo
 * directly rendered on curved skin from prompt description alone.
 */
/** Remove flat-design keywords that leak from generate-style prompts */
function cleanPromptForTryon(raw: string): string {
    return raw
        .replaceAll(/tattoo flash sheet style/gi, "")
        .replaceAll(/white background/gi, "")
        .replaceAll(/flash sheet/gi, "")
        .replaceAll(/,\s*,/g, ",")
        .replaceAll(/^[\s,]+|[\s,]+$/g, "")
        .trim();
}

/** Check if text contains Korean characters */
function containsKorean(text: string): boolean {
    return /[가-힣]/.test(text);
}

/** Translate Korean to English — keyword-based for clean subject extraction */
function translateToEnglish(prompt: string): string {
    if (!containsKorean(prompt)) return prompt;
    return translateKoreanKeywords(prompt);
}

/** Korean tattoo keywords → English (fallback) */
const KO_EN: [RegExp, string][] = [
    [/위엄있는/g, "majestic imposing"], [/사나운/g, "fierce ferocious"],
    [/무서운/g, "menacing"], [/귀여운/g, "cute adorable"], [/아기/g, "baby"],
    [/웅장한/g, "grand magnificent"], [/강한/g, "powerful"],
    [/우아한/g, "elegant"], [/섬세한/g, "delicate intricate"],
    [/호랑이/g, "tiger"], [/용/g, "dragon"], [/잉어/g, "koi fish"],
    [/봉황/g, "phoenix"], [/뱀/g, "snake"], [/사자/g, "lion"],
    [/늑대/g, "wolf"], [/나비/g, "butterfly"], [/문어/g, "octopus"],
    [/고래/g, "whale"], [/여우/g, "fox"], [/곰/g, "bear"],
    [/고양이/g, "cat"], [/사슴/g, "deer"], [/독수리/g, "eagle"],
    [/장미/g, "rose"], [/연꽃/g, "lotus"], [/벚꽃/g, "cherry blossom"],
    [/꽃/g, "flower"], [/나무/g, "tree"], [/대나무/g, "bamboo"],
    [/해골/g, "skull"], [/십자가/g, "cross"], [/하트/g, "heart"],
    [/별/g, "star"], [/달/g, "moon"], [/태양/g, "sun"],
    [/왕관/g, "crown"], [/타투/g, "tattoo"],
];

function translateKoreanKeywords(text: string): string {
    let result = text;
    for (const [pattern, replacement] of KO_EN) {
        result = result.replaceAll(pattern, replacement);
    }
    return result.replaceAll(/[가-힣]+/g, "").replaceAll(/,\s*,/g, ",").replaceAll(/^\s*,|,\s*$/g, "").trim();
}

async function buildBodyPartWorkflow(
    originalPrompt: string,
    style: string,
    bodyPart: string
): Promise<Record<string, unknown>> {
    // eslint-disable-next-line security/detect-object-injection -- Safe: known key lookup
    const styleDesc = STYLE_PROMPTS[style] || STYLE_PROMPTS.minimal;
    // eslint-disable-next-line security/detect-object-injection -- Safe: known key lookup
    const bodyPartEn = BODY_PART_EN[bodyPart] || bodyPart;
    const translated = translateToEnglish(originalPrompt);
    const cleanedSubject = cleanPromptForTryon(translated);

    // FLUX best practice: Subject FIRST, then Action → Style → Context
    const positivePrompt = `A ${cleanedSubject} tattoo on a person's ${bodyPartEn}. `
        + `${styleDesc}, permanently inked into real skin. `
        + `The healed ink is embedded deep in the dermis layer with visible skin pores and fine body hair through the ink. `
        + `The edges fade naturally where ink diffuses into bare skin. `
        + `The tattoo follows the natural curves of the ${bodyPartEn}, conforming to muscles and bone structure. `
        + `Close-up professional tattoo photography, studio lighting, shallow depth of field, `
        + `natural skin tone, photorealistic, 8k.`;

    const negativePrompt = "sticker, decal, pasted on, floating, 2d overlay, flat graphic, "
        + "paper, white background, digital art, illustration, cartoon, anime, drawing, sketch, "
        + "blurry, distorted, low quality, watermark, text";

    return {
        "1": CLIP_LOADER_NODE,
        "2": clipEncode(positivePrompt),
        "3": UNET_LOADER_NODE,
        "4": { class_type: "EmptySD3LatentImage", inputs: { width: 1024, height: 1024, batch_size: 1 } },
        "5": {
            class_type: "KSampler",
            inputs: {
                model: ["3", 0], positive: ["2", 0], negative: ["6", 0],
                latent_image: ["4", 0], seed: randomSeed(),
                steps: 25, cfg: 1, sampler_name: "euler", scheduler: "simple", denoise: 1,
            },
        },
        "6": clipEncode(negativePrompt),
        "7": VAE_LOADER_NODE,
        "8": { class_type: "VAEDecode", inputs: { samples: ["5", 0], vae: ["7", 0] } },
        "9": { class_type: "SaveImage", inputs: { images: ["8", 0], filename_prefix: "tryon_bodypart" } },
    };
}

function buildTryonWorkflow(
    bodyImage: string,
    tattooImage: string,
    mask: string,
    prompt: string = "tattoo on skin, photorealistic, natural lighting, skin texture preserved, seamless blend",
): Record<string, unknown> {
    const inpaintPrompt = prompt;

    return {
        "1": CLIP_LOADER_NODE,
        "2": clipEncode(inpaintPrompt),
        "3": UNET_LOADER_NODE,
        "4": { class_type: "ETN_LoadImageBase64", inputs: { image: bodyImage } },
        "5": { class_type: "ETN_LoadMaskBase64", inputs: { image: mask } },
        "6": { class_type: "ETN_LoadImageBase64", inputs: { image: tattooImage } },
        "7": VAE_LOADER_NODE,
        "14": {
            class_type: "ImageScale",
            inputs: { image: ["6", 0], width: 1024, height: 1024, upscale_method: "lanczos", crop: "center" },
        },
        "15": {
            class_type: "ImageCompositeMasked",
            inputs: { destination: ["4", 0], source: ["14", 0], mask: ["5", 0], x: 0, y: 0, resize_source: true },
        },
        "8": { class_type: "VAEEncode", inputs: { pixels: ["15", 0], vae: ["7", 0] } },
        "9": { class_type: "SetLatentNoiseMask", inputs: { samples: ["8", 0], mask: ["5", 0] } },
        "10": {
            class_type: "KSampler",
            inputs: {
                model: ["3", 0], positive: ["2", 0], negative: ["11", 0],
                latent_image: ["9", 0], seed: randomSeed(),
                steps: 25, cfg: 1, sampler_name: "euler", scheduler: "simple", denoise: 0.55,
            },
        },
        "11": clipEncode(""),
        "12": { class_type: "VAEDecode", inputs: { samples: ["10", 0], vae: ["7", 0] } },
        "13": { class_type: "SaveImage", inputs: { images: ["12", 0], filename_prefix: "tryon" } },
    };
}
