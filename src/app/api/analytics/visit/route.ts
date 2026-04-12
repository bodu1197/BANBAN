import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getClient(): SupabaseClient {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    );
}

interface VisitBody {
    path: string;
    user_agent: string;
    referer: string;
    visitor_id: string;
}

function extractIp(request: Request): string {
    return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        ?? request.headers.get("x-real-ip")
        ?? "";
}

async function insertVisit(request: Request, body: VisitBody): Promise<void> {
    const supabase = getClient();
    await supabase.from("page_visits" as "profiles").insert({
        path: body.path,
        country: request.headers.get("x-vercel-ip-country") ?? "",
        user_agent: body.user_agent || null,
        referer: body.referer || null,
        ip: extractIp(request),
        visitor_id: body.visitor_id,
    } as never);
}

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const body = await request.json() as VisitBody;

        if (!body.path || !body.visitor_id) {
            return NextResponse.json({ error: "path and visitor_id required" }, { status: 400 });
        }

        await insertVisit(request, body);
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: "failed" }, { status: 500 });
    }
}
