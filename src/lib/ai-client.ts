/**
 * AI Client for HowTattoo
 *
 * Centralized AI client connecting to self-hosted AI servers.
 * - Text AI: vLLM (Qwen) on SORI shared server or HowTattoo AI server
 * - Image AI: ComfyUI (FLUX.2-dev) on HowTattoo AI server
 * - Mask AI: SAM2 on HowTattoo AI server
 *
 * Environment variables:
 *   SORI_AI_BASE_URL  - vLLM/llama.cpp server base URL
 *   SORI_AI_API_KEY   - API key (dummy for llama.cpp)
 *   COMFYUI_URL       - ComfyUI server URL (Cloudflare Tunnel)
 *   SAM2_URL          - SAM2 server URL (Cloudflare Tunnel)
 */

import OpenAI from "openai";

let aiInstance: OpenAI | null = null;

export function getAI(): OpenAI | null {
    if (typeof globalThis.window !== "undefined") return null;

    if (!aiInstance) {
        const baseURL = process.env.VLLM_URL || process.env.SORI_AI_BASE_URL;
        const apiKey = process.env.SORI_AI_API_KEY || "sk-dummy";
        if (!baseURL) return null;

        aiInstance = new OpenAI({
            baseURL: `${baseURL}/v1`,
            apiKey,
        });
    }
    return aiInstance;
}

export const AI_MODEL = process.env.AI_MODEL || "Qwen/Qwen2.5-14B-Instruct";

export function isAIConfigured(): boolean {
    return Boolean(process.env.COMFYUI_URL || process.env.SORI_AI_BASE_URL);
}

// Vercel CLI occasionally pipes trailing newlines into env values when they are
// added via `echo ... | vercel env add` — see 2026-04-07 sitemap incident and
// 2026-04-08 CLIP search incident. Always trim URL env vars at the boundary.
// eslint-disable-next-line security/detect-object-injection -- key is always a hard-coded literal from our own module, never user input
const envUrl = (key: string): string => (process.env[key] || "").trim();

/** ComfyUI server base URL (FLUX.2-dev image generation) */
export const COMFYUI_URL = envUrl("COMFYUI_URL");

/** SAM2 server base URL (body part segmentation) */
export const SAM2_URL = envUrl("SAM2_URL");

/** Vision AI server base URL (image-to-prompt analysis) */
export const VISION_URL = envUrl("VISION_URL");

/** CLIP embedding server base URL (image similarity search) */
export const CLIP_URL = envUrl("CLIP_URL");

/** FLUX-Makeup server base URL (face beauty simulation) */
export const MAKEUP_URL = envUrl("MAKEUP_URL");
