/**
 * POST /api/ai/search-similar
 *
 * Find visually similar portfolios using CLIP embeddings + pgvector cosine similarity.
 * Supports both image search (base64) and text search (prompt string).
 *
 * Body: { image?: string, text?: string, matchCount?: number, threshold?: number }
 */

import { NextRequest, NextResponse } from "next/server";
import { CLIP_URL } from "@/lib/ai-client";
import { createClient as createSupabaseDirectClient } from "@supabase/supabase-js";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function getClientIp(request: NextRequest): string {
    const fwd = request.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    return request.headers.get("x-real-ip") ?? "unknown";
}

function preflight(request: NextRequest): NextResponse | null {
    if (!CLIP_URL) {
        return NextResponse.json({ error: "CLIP server not configured" }, { status: 503 });
    }
    // Public endpoint — rate-limit by IP to prevent abuse.
    const ip = getClientIp(request);
    const { success: rateLimitOk } = rateLimit({ key: `search-similar:${ip}`, limit: 15, windowMs: 60_000 });
    if (!rateLimitOk) return rateLimitResponse() as NextResponse;
    return null;
}

async function handleSearch(body: { image?: string; text?: string; matchCount?: number; threshold?: number }): Promise<NextResponse> {
    const { image, text, matchCount = 20, threshold = 0.3 } = body;
    if (!image && !text) {
        return NextResponse.json({ error: "image (base64) or text (prompt) is required" }, { status: 400 });
    }

    const embedding = text
        ? await fetchTextEmbedding(text as string)
        : await fetchImageEmbedding(image as string);
    const matches = await searchSimilar(embedding, threshold as number, matchCount as number);
    const results = await enrichResults(matches);

    if (matches.length > 0) {
        saveAllResults(matches).catch(() => { /* fire-and-forget */ });
    }

    return NextResponse.json({ results, count: results.length, mode: text ? "text" : "image" });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const blocked = preflight(request);
    if (blocked) return blocked;

    try {
        return await handleSearch(await request.json());
    } catch (err) {
        // eslint-disable-next-line no-console -- Server-side error logging
        console.error("[AI/search-similar] Error:", err);
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
}

async function fetchImageEmbedding(imageBase64: string): Promise<number[]> {
    const res = await fetch(`${CLIP_URL}/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: imageBase64 }),
    });
    if (!res.ok) throw new Error(`Image embedding failed: ${await res.text().catch(() => "unknown")}`);
    const { embedding } = await res.json();
    return embedding;
}

async function fetchTextEmbedding(text: string): Promise<number[]> {
    const res = await fetch(`${CLIP_URL}/embed/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`Text embedding failed: ${await res.text().catch(() => "unknown")}`);
    const { embedding } = await res.json();
    return embedding;
}

interface MatchRow { portfolio_media_id: string; portfolio_id: string; storage_path: string; similarity: number }

async function searchSimilar(embedding: number[], threshold: number, matchCount: number): Promise<MatchRow[]> {
    const supabase = createSupabaseDirectClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase.rpc("match_portfolios", {
        query_embedding: JSON.stringify(embedding),
        match_threshold: threshold,
        match_count: matchCount,
    });
    if (error) throw new Error(`DB search failed: ${error.message}`);
    return (data ?? []) as MatchRow[];
}

interface EnrichedResult {
    mediaId: string;
    portfolioId: string;
    storagePath: string;
    similarity: number;
    portfolio: Record<string, unknown> | null;
}

async function saveAllResults(matches: MatchRow[]): Promise<void> {
    const supabase = createSupabaseDirectClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await supabase.rpc("upsert_similarity_top_batch", {
        p_media_ids: matches.map((m) => m.portfolio_media_id),
        p_portfolio_ids: matches.map((m) => m.portfolio_id),
        p_storage_paths: matches.map((m) => m.storage_path),
        p_similarities: matches.map((m) => m.similarity),
    });
}

async function enrichResults(matches: MatchRow[]): Promise<EnrichedResult[]> {
    if (matches.length === 0) return [];

    const portfolioIds = [...new Set(matches.map((m) => m.portfolio_id))];
    const supabase = createSupabaseDirectClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: portfolios } = await supabase
        .from("portfolios")
        .select("id, title, price, discount_rate, likes_count, artist:artists!artist_id(id, title, region:regions(name))")
        .in("id", portfolioIds);

    const portfolioMap = new Map((portfolios ?? []).map((p: Record<string, unknown>) => [p.id, p]));

    return matches.map((m) => ({
        mediaId: m.portfolio_media_id,
        portfolioId: m.portfolio_id,
        storagePath: m.storage_path,
        similarity: Math.round(m.similarity * 100) / 100,
        portfolio: portfolioMap.get(m.portfolio_id) ?? null,
    }));
}
