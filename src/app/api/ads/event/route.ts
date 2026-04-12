import { NextResponse, type NextRequest } from "next/server";
import { recordAdEvent } from "@/lib/supabase/ad-queries";

/** Record an ad impression or click event */
export async function POST(request: NextRequest): Promise<NextResponse> {
    const body = await request.json() as {
        subscriptionId: string;
        eventType: "IMPRESSION" | "CLICK";
        placement: string;
        pagePath?: string;
    };

    if (!body.subscriptionId || !body.eventType || !body.placement) {
        return NextResponse.json({ error: "missing_params" }, { status: 400 });
    }

    await recordAdEvent({
        subscriptionId: body.subscriptionId,
        eventType: body.eventType,
        placement: body.placement,
        pagePath: body.pagePath,
    });

    return NextResponse.json({ success: true });
}
