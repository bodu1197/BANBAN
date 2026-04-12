/**
 * GET /api/ai/reference
 *
 * Returns popular/successful AI-generated tattoo prompts for AI reference.
 * The generate API can use this data to improve prompt quality
 * by learning from high-engagement (liked) past generations.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const { searchParams } = request.nextUrl;
        const style = searchParams.get("style");
        const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 100);

        const admin = createAdminClient();

        let query = admin
            .from("ai_generated_tattoos")
            .select("prompt, flux_prompt, style, body_part, generation_type, likes_count")
            .eq("is_public", true)
            .order("likes_count", { ascending: false })
            .limit(limit);

        if (style) {
            query = query.eq("style", style);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
        }

        // Return structured reference data for AI consumption
        const references = (data ?? []).map((row) => ({
            prompt: row.prompt,
            fluxPrompt: row.flux_prompt,
            style: row.style,
            bodyPart: row.body_part,
            type: row.generation_type,
            likes: row.likes_count,
        }));

        return NextResponse.json({
            references,
            totalCount: references.length,
            description: "Popular AI tattoo generation prompts. Use flux_prompt for FLUX model reference.",
        });
    } catch {
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
