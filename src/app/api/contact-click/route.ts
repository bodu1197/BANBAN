import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json() as {
            artistId: string;
            clickType: "kakao" | "phone";
            sourcePage: "portfolio" | "artist" | "event" | "course";
            sourceId?: string;
            visitorId?: string;
        };

        if (!body.artistId || !body.clickType || !body.sourcePage) {
            return NextResponse.json({ error: "missing_fields" }, { status: 400 });
        }

        const supabase = createAdminClient();

        const { error } = await supabase.from("contact_clicks").insert({
            artist_id: body.artistId,
            click_type: body.clickType,
            source_page: body.sourcePage,
            source_id: body.sourceId ?? null,
            visitor_id: body.visitorId ?? null,
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "failed" }, { status: 500 });
    }
}
