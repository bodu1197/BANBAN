import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { getPointHistory } from "@/lib/supabase/point-queries";
import { parsePagination } from "@/lib/api-helpers";

export async function GET(request: NextRequest): Promise<NextResponse> {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const { limit, offset } = parsePagination(searchParams);

    const result = await getPointHistory(user.id, limit, offset);
    return NextResponse.json(result);
}
