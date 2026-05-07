import { NextResponse, type NextRequest } from "next/server";
import { getAdPlans, getAdDurationOptions } from "@/lib/supabase/ad-queries";

export async function GET(request: NextRequest): Promise<NextResponse> {
    const artistType = request.nextUrl.searchParams.get("artistType") as "SEMI_PERMANENT" | null;
    const validType = artistType === "SEMI_PERMANENT" ? artistType : undefined;
    const [plans, durations] = await Promise.all([getAdPlans(validType), getAdDurationOptions()]);
    return NextResponse.json({ plans, durations });
}
