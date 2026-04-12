import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getUser } from "@/lib/supabase/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * Verify the current user is an admin (is_admin=true).
 * Returns an admin supabase client (service_role, bypasses RLS) for data queries.
 */
export async function requireAdmin(): Promise<
    | { ok: true; userId: string; supabase: SupabaseClient<Database> }
    | { ok: false; response: NextResponse }
> {
    const user = await getUser();
    if (!user) return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };

    // Use cookie-based client for auth check (RLS allows reading own profile)
    const userClient = await createClient();
    const { data: profile } = await userClient
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

    const isAdmin = (profile as { is_admin: boolean } | null)?.is_admin;
    if (!isAdmin) return { ok: false, response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };

    // Return admin client (service_role) that bypasses RLS for admin queries
    return { ok: true, userId: user.id, supabase: createAdminClient() };
}
