import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-guard";

export async function GET(): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { count } = await auth.supabase
        .from("sim_usage_logs")
        .select("id", { count: "exact", head: true });

    return NextResponse.json({ total: count ?? 0 });
}
