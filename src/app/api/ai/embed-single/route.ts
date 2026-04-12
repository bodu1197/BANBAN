/**
 * POST /api/ai/embed-single
 *
 * Embed a single portfolio image via CLIP server.
 * Called by Supabase Database Webhook on portfolio_media INSERT.
 *
 * Expects JSON body:
 *   { record: { id, storage_path, type } }        — Supabase webhook format
 *   { mediaId, storagePath }                       — Direct call format
 */

import { NextRequest, NextResponse } from "next/server";
import { CLIP_URL } from "@/lib/ai-client";
import { getUser } from "@/lib/supabase/auth";
import pg from "pg";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const DATABASE_URL = process.env.DATABASE_URL ?? "";
const STORAGE_BUCKET = "portfolios";
const WEBHOOK_SECRET = process.env.EMBED_WEBHOOK_SECRET ?? "";

async function isAuthorized(request: NextRequest): Promise<boolean> {
    const authHeader = request.headers.get("authorization") ?? "";
    if (WEBHOOK_SECRET && authHeader === `Bearer ${WEBHOOK_SECRET}`) return true;
    const user = await getUser();
    return !!user;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    if (!CLIP_URL) return NextResponse.json({ error: "CLIP server not configured" }, { status: 503 });

    if (!(await isAuthorized(request))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { mediaId, storagePath } = parsePayload(body);

        if (!mediaId || !storagePath) {
            return NextResponse.json({ error: "mediaId and storagePath are required" }, { status: 400 });
        }

        const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${storagePath}`;
        const embedding = await fetchEmbedding(imageUrl);
        await saveEmbedding(mediaId, embedding);

        return NextResponse.json({ success: true, mediaId });
    } catch (err) {
        // eslint-disable-next-line no-console -- Server-side error logging
        console.error("[AI/embed-single] Error:", err);
        return NextResponse.json({ error: "Embedding failed" }, { status: 500 });
    }
}

/** Parse both Supabase webhook format and direct call format */
function parsePayload(body: Record<string, unknown>): { mediaId: string; storagePath: string } {
    if (body.record && typeof body.record === "object") {
        const record = body.record as Record<string, unknown>;
        if (record.type !== "image") return { mediaId: "", storagePath: "" };
        return { mediaId: record.id as string, storagePath: record.storage_path as string };
    }
    return { mediaId: body.mediaId as string, storagePath: body.storagePath as string };
}

async function fetchEmbedding(imageUrl: string): Promise<number[]> {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Image download failed: ${String(imgRes.status)}`);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const base64 = buffer.toString("base64");

    const res = await fetch(`${CLIP_URL}/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: base64 }),
    });
    if (!res.ok) throw new Error(`CLIP server returned ${String(res.status)}`);
    const data = await res.json() as { embedding: number[] };
    if (!data.embedding) throw new Error("No embedding returned");
    return data.embedding;
}

async function saveEmbedding(mediaId: string, embedding: number[]): Promise<void> {
    const client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    try {
        await client.query(
            `INSERT INTO portfolio_embeddings (portfolio_media_id, embedding) VALUES ($1, $2)
             ON CONFLICT (portfolio_media_id) DO UPDATE SET embedding = $2`,
            [mediaId, JSON.stringify(embedding)],
        );
    } finally {
        await client.end();
    }
}
