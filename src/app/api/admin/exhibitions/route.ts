import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-guard";

// ─── Types ───────────────────────────────────────────────

interface ExhibitionBody {
    id?: string;
    title?: string;
    subtitle?: string;
    image_path?: string;
    link_url?: string | null;
    category?: string;
    order_index?: number;
    is_active?: boolean;
    start_at?: string | null;
    end_at?: string | null;
}

const COLUMNS = "id, title, subtitle, image_path, link_url, category, order_index, is_active, start_at, end_at, created_at, exhibition_entries(count)";
const COLUMNS_NO_COUNT = "id, title, subtitle, image_path, link_url, category, order_index, is_active, start_at, end_at, created_at";

const UPDATABLE_KEYS = ["title", "subtitle", "image_path", "link_url", "category", "order_index", "is_active", "start_at", "end_at"] as const;

// ─── Helpers ─────────────────────────────────────────────

function buildInsertRow(body: ExhibitionBody): {
    title: string; subtitle: string | null; image_path: string; link_url: string | null;
    category: string; order_index: number; is_active: boolean; start_at: string | null; end_at: string | null;
} {
    return {
        title: body.title as string,
        subtitle: body.subtitle ?? null,
        image_path: body.image_path as string,
        link_url: body.link_url ?? null,
        category: body.category ?? "SEMI_PERMANENT",
        order_index: body.order_index ?? 0,
        is_active: body.is_active ?? true,
        start_at: body.start_at ?? null,
        end_at: body.end_at ?? null,
    };
}

function buildUpdates(body: ExhibitionBody): Record<string, unknown> {
    const updates: Record<string, unknown> = {};
    for (const key of UPDATABLE_KEYS) {
        // eslint-disable-next-line security/detect-object-injection -- Safe: iterating over constant key list
        const val = body[key];
        // eslint-disable-next-line security/detect-object-injection -- Safe: iterating over constant key list
        if (val !== undefined) updates[key] = val;
    }
    return updates;
}

// ─── GET ─────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const category = new URL(request.url).searchParams.get("category");

    let query = auth.supabase
        .from("exhibitions")
        .select(COLUMNS)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: false });

    if (category) query = query.eq("category", category);

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fetch pending counts separately (non-blocking)
    const pendingMap = new Map<string, number>();
    try {
        const { data: pendingData } = await auth.supabase
            .from("exhibition_entries")
            .select("exhibition_id")
            .eq("status", "pending");
        for (const row of (pendingData ?? []) as Array<{ exhibition_id: string }>) {
            pendingMap.set(row.exhibition_id, (pendingMap.get(row.exhibition_id) ?? 0) + 1);
        }
    } catch { /* pending count is optional */ }

    const exhibitions = (data ?? []).map((ex: Record<string, unknown>) => ({
        ...ex,
        pending_count: pendingMap.get(ex.id as string) ?? 0,
    }));

    return NextResponse.json({ exhibitions });
}

// ─── POST ────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json() as ExhibitionBody;
    if (!body.title || !body.image_path) {
        return NextResponse.json({ error: "title and image_path are required" }, { status: 400 });
    }

    const { data, error } = await auth.supabase
        .from("exhibitions")
        .insert(buildInsertRow(body))
        .select(COLUMNS_NO_COUNT)
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ exhibition: data });
}

// ─── PATCH ───────────────────────────────────────────────

export async function PATCH(request: NextRequest): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json() as ExhibitionBody;
    if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const updates = buildUpdates(body);
    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: "no fields to update" }, { status: 400 });
    }

    const { data, error } = await auth.supabase
        .from("exhibitions")
        .update(updates)
        .eq("id", body.id)
        .select(COLUMNS_NO_COUNT)
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ exhibition: data });
}

// ─── DELETE ──────────────────────────────────────────────

export async function DELETE(request: NextRequest): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json() as { id: string };
    if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { error } = await auth.supabase
        .from("exhibitions")
        .delete()
        .eq("id", body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
