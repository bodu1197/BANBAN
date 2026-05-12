/**
 * POST /api/ai/embed-batch
 *
 * Batch process portfolio images to generate CLIP embeddings.
 * Admin-only endpoint for populating the portfolio_embeddings table.
 */

import { NextRequest, NextResponse } from "next/server";
import { CLIP_URL } from "@/lib/ai-client";
import pg from "pg";

/** Allow up to 300s for batch embedding processing */
export const maxDuration = 300;

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const DATABASE_URL = process.env.DATABASE_URL ?? "";
const STORAGE_BUCKET = "portfolios";
const BATCH_SIZE = 10;

export async function POST(request: NextRequest): Promise<NextResponse> {
    if (!CLIP_URL) return NextResponse.json({ error: "CLIP server not configured" }, { status: 503 });

    try {
        const { limit = 100, offset = 0 } = await request.json().catch(() => ({}));
        const toProcess = await getUnembeddedMedia(offset as number, limit as number);

        if (toProcess.length === 0) {
            return NextResponse.json({ processed: 0, message: "No more images to process" });
        }

        const result = await processBatches(toProcess);
        return NextResponse.json(result);
    } catch (err) {
        // eslint-disable-next-line no-console -- Server-side error logging
        console.error("[AI/embed-batch] Error:", err);
        return NextResponse.json({ error: "Batch embedding failed" }, { status: 500 });
    }
}

interface MediaItem { id: string; storage_path: string }

async function getUnembeddedMedia(offset: number, limit: number): Promise<MediaItem[]> {
    const client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    try {
        const { rows } = await client.query(
            `SELECT pm.id, pm.storage_path FROM portfolio_media pm
             LEFT JOIN portfolio_embeddings pe ON pe.portfolio_media_id = pm.id
             WHERE pm.type = 'image' AND pe.id IS NULL
             ORDER BY pm.created_at ASC LIMIT $1 OFFSET $2`,
            [limit, offset],
        );
        return rows as MediaItem[];
    } finally {
        await client.end();
    }
}

async function processBatches(media: MediaItem[]): Promise<{ processed: number; failed: number; total: number; message: string }> {
    let processed = 0;
    let failed = 0;

    for (let i = 0; i < media.length; i += BATCH_SIZE) {
        const chunk = media.slice(i, i + BATCH_SIZE);
        const result = await embedChunk(chunk);
        processed += result.processed;
        failed += result.failed;
    }

    return { processed, failed, total: media.length, message: `Embedded ${String(processed)}/${String(media.length)} images` };
}

async function embedOne(imageUrl: string): Promise<number[] | null> {
    try {
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) return null;
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const base64 = buffer.toString("base64");

        const res = await fetch(`${CLIP_URL}/embed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image_base64: base64 }),
        });
        if (!res.ok) return null;
        const data = await res.json() as { embedding: number[] };
        return data.embedding ?? null;
    } catch {
        return null;
    }
}

async function embedChunk(chunk: MediaItem[]): Promise<{ processed: number; failed: number }> {
    let failCount = 0;
    const client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    try {
        for (const item of chunk) {
            const url = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${item.storage_path}`;
            const emb = await embedOne(url);
            if (!emb) { failCount++; continue; }
            await client.query(
                `INSERT INTO portfolio_embeddings (portfolio_media_id, embedding) VALUES ($1, $2)
                 ON CONFLICT (portfolio_media_id) DO UPDATE SET embedding = $2`,
                [item.id, JSON.stringify(emb)],
            );
        }
    } finally {
        await client.end();
    }
    return { processed: chunk.length - failCount, failed: failCount };
}
