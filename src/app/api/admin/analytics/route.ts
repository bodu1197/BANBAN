import { NextResponse } from "next/server";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

interface PathRow { path: string; count: number }

function getUntypedClient(): SupabaseClient {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    );
}

const PERIOD_RPC_MAP: Record<string, string> = {
    hourly: "analytics_hourly",
    daily: "analytics_daily",
    monthly: "analytics_monthly",
    yearly: "analytics_yearly",
};

async function fetchChartData(supabase: SupabaseClient, period: string): Promise<unknown[]> {
    // eslint-disable-next-line security/detect-object-injection -- Safe: validated against PERIOD_RPC_MAP keys
    const rpcName = PERIOD_RPC_MAP[period];
    if (!rpcName) return [];
    const { data } = await supabase.rpc(rpcName);
    return (data as unknown[]) ?? [];
}

interface Counts {
    periodPV: number;
    periodUV: number;
    totalPV: number;
    totalUV: number;
}

async function fetchCounts(supabase: SupabaseClient, period: string): Promise<Counts> {
    const { data } = await supabase.rpc("analytics_period_counts", { p_period: period });
    const row = (data as { period_pv: number; period_uv: number; total_pv: number; total_uv: number }[] | null)?.[0];
    return {
        periodPV: row?.period_pv ?? 0,
        periodUV: row?.period_uv ?? 0,
        totalPV: row?.total_pv ?? 0,
        totalUV: row?.total_uv ?? 0,
    };
}

export async function GET(request: Request): Promise<NextResponse> {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") ?? "daily";
    const supabase = getUntypedClient();

    const [counts, chartData, pathRes] = await Promise.all([
        fetchCounts(supabase, period),
        fetchChartData(supabase, period),
        supabase.rpc("analytics_top_paths", { p_period: period }).then((r) => r as unknown as { data: PathRow[] | null }),
    ]);

    return NextResponse.json({
        ...counts,
        chartData,
        topPaths: pathRes.data ?? [],
    });
}
