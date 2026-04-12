/**
 * ComfyUI API utilities
 *
 * Shared functions for interacting with ComfyUI server.
 */

import { COMFYUI_URL } from "@/lib/ai-client";

/**
 * Queue a ComfyUI workflow and return the prompt_id.
 */
export async function queuePrompt(workflow: Record<string, unknown>): Promise<string> {
    const res = await fetch(`${COMFYUI_URL}/api/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: workflow }),
        signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`ComfyUI error: ${text}`);
    }

    const data = await res.json();
    return data.prompt_id as string;
}

/**
 * Poll ComfyUI history for a completed prompt and return the first output image as base64.
 */
export async function pollForImage(promptId: string, maxWaitMs = 120000): Promise<string | null> {
    const images = await pollForAllImages(promptId, maxWaitMs);
    return images[0] ?? null;
}

/**
 * Poll ComfyUI history for a completed prompt and return ALL output images as base64.
 */
export async function pollForAllImages(promptId: string, maxWaitMs = 120000): Promise<string[]> {
    const interval = 2000;
    const start = Date.now();

    while (Date.now() - start < maxWaitMs) {
        await new Promise((r) => setTimeout(r, interval));
        const images = await fetchCompletedImages(promptId);
        if (images.length > 0) return images;
    }

    return [];
}

async function fetchCompletedImages(promptId: string): Promise<string[]> {
    const res = await fetch(`${COMFYUI_URL}/api/history/${promptId}`, {
        signal: AbortSignal.timeout(5000),
    }).catch(() => null);

    if (!res?.ok) return [];

    const data = await res.json();
    const history = data[promptId as keyof typeof data] as { status?: { completed?: boolean }; outputs?: Record<string, { images?: { filename: string; subfolder?: string; type?: string }[] }> } | undefined;
    if (!history?.status?.completed || !history.outputs) return [];

    return fetchAllOutputImages(history.outputs);
}

async function fetchAllOutputImages(
    outputs: Record<string, { images?: { filename: string; subfolder?: string; type?: string }[] }>
): Promise<string[]> {
    const results: string[] = [];

    for (const nodeOutput of Object.values(outputs)) {
        if (!nodeOutput.images) continue;

        for (const img of nodeOutput.images) {
            const b64 = await fetchSingleImage(img);
            if (b64) results.push(b64);
        }
    }
    return results;
}

async function fetchSingleImage(img: { filename: string; subfolder?: string; type?: string }): Promise<string | null> {
    const params = new URLSearchParams({
        filename: img.filename,
        subfolder: img.subfolder || "",
        type: img.type || "output",
    });
    const imgRes = await fetch(`${COMFYUI_URL}/api/view?${params}`, {
        signal: AbortSignal.timeout(10000),
    }).catch(() => null);

    if (!imgRes?.ok) return null;
    const buffer = await imgRes.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
}
