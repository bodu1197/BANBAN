/**
 * GET /api/ai/embed-status
 *
 * Check embedding progress — how many portfolio images have been embedded.
 */

import { NextResponse } from "next/server";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL ?? "";

export async function GET(): Promise<NextResponse> {
    const client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    try {
        const { rows: [{ total }] } = await client.query(
            "SELECT COUNT(*) AS total FROM portfolio_media WHERE type = 'image'",
        );
        const { rows: [{ embedded }] } = await client.query(
            "SELECT COUNT(*) AS embedded FROM portfolio_embeddings",
        );

        const totalNum = Number(total);
        const embeddedNum = Number(embedded);

        return NextResponse.json({
            totalImages: totalNum,
            embedded: embeddedNum,
            remaining: totalNum - embeddedNum,
            progress: totalNum > 0 ? Math.round((embeddedNum / totalNum) * 100) : 0,
        });
    } finally {
        await client.end();
    }
}
