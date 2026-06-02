/**
 * POST /api/ai/embed-batch
 *
 * Batch process portfolio images to generate CLIP embeddings.
 * Admin-only endpoint for populating the portfolio_embeddings table.
 */

import { NextRequest, NextResponse } from "next/server";
import { CLIP_URL } from "@/lib/ai-client";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { getStorageUrl, isSafeStoragePath } from "@/lib/supabase/storage-utils";
import pg from "pg";

/** Allow up to 300s for batch embedding processing */
export const maxDuration = 300;

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const BATCH_SIZE = 10;

export async function POST(request: NextRequest): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    if (!CLIP_URL) return NextResponse.json({ error: "CLIP server not configured" }, { status: 503 });

    try {
        const { limit = 100, offset = 0 } = await request.json().catch(() => ({}));
        const toProcess = await getUnembeddedMedia(offset as number, limit as number);

        if (toProcess.length === 0) {
            return NextResponse.json({ processed: 0, message: "No more images to process" });
        }

        const result = await processBatches(toProcess);
        return NextResponse.json(result);
    } catch (err: unknown) {
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
    const client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    try {
        // 1) 모든 임베딩을 병렬로 (CLIP 서버 호출이 가장 큰 비용 — 네트워크 latency 병렬화 효과 큼)
        const results = await Promise.all(
            chunk.map(async (item) => {
                // SSRF 방어: 안전한 버킷 상대 경로만 fetch (절대 URL/스킴 거부).
                if (!isSafeStoragePath(item.storage_path)) return { item, emb: null };
                const url = getStorageUrl(item.storage_path) ?? "";
                const emb = await embedOne(url);
                return { item, emb };
            }),
        );

        // 2) 성공한 것만 추출하여 DB insert 직렬 처리.
        //    pg.Client 는 단일 connection — 동시 query 호출 시 "another query is already in progress" 에러.
        //    따라서 query 는 await 로 순차. (병렬화 필요시 pg.Pool 마이그레이션)
        const succeeded = results.filter((r): r is { item: MediaItem; emb: number[] } => r.emb !== null);
        const failCount = results.length - succeeded.length;

        for (const r of succeeded) {
            await client.query(
                `INSERT INTO portfolio_embeddings (portfolio_media_id, embedding) VALUES ($1, $2)
                 ON CONFLICT (portfolio_media_id) DO UPDATE SET embedding = $2`,
                [r.item.id, JSON.stringify(r.emb)],
            );
        }

        return { processed: succeeded.length, failed: failCount };
    } finally {
        await client.end();
    }
}
