import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/supabase/admin-guard";

// ─── Types ───────────────────────────────────────────────

interface PatchBody {
    title?: string;
    description?: string;
    price?: number;
    price_origin?: number;
    discount_rate?: number;
    sale_ended_at?: string | null;
    categoryIds?: string[];
    deletedMediaIds?: string[];
}

// ─── Helpers ─────────────────────────────────────────────

function buildUpdates(body: PatchBody): Record<string, unknown> {
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.price !== undefined) updates.price = body.price;
    if (body.price_origin !== undefined) updates.price_origin = body.price_origin;
    if (body.discount_rate !== undefined) updates.discount_rate = body.discount_rate;
    if (body.sale_ended_at !== undefined) updates.sale_ended_at = body.sale_ended_at;
    return updates;
}

async function syncCategories(supabase: SupabaseClient, id: string, categoryIds: string[]): Promise<void> {
    await supabase.from("categorizables").delete().eq("categorizable_type", "portfolio").eq("categorizable_id", id);
    if (categoryIds.length > 0) {
        const rows = categoryIds.map((category_id) => ({
            category_id,
            categorizable_type: "portfolio" as const,
            categorizable_id: id,
        }));
        await supabase.from("categorizables").insert(rows);
    }
}

/** GET /api/admin/portfolios/[id] — 포트폴리오 상세 (수정용) */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const { supabase } = auth;

    const { data: portfolio, error } = await supabase
        .from("portfolios")
        .select("*, artist:artists(id, title, type_artist)")
        .eq("id", id)
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 404 });

    const { data: media } = await supabase
        .from("portfolio_media")
        .select("id, type, storage_path, order_index")
        .eq("portfolio_id", id)
        .order("order_index", { ascending: true });

    const { data: cats } = await supabase
        .from("categorizables")
        .select("category_id")
        .eq("categorizable_type", "portfolio")
        .eq("categorizable_id", id);

    const categoryIds = (cats ?? []).map((c: { category_id: string }) => c.category_id);

    return NextResponse.json({ portfolio, media: media ?? [], categoryIds });
}

/** PATCH /api/admin/portfolios/[id] — 포트폴리오 수정 (전체 필드) */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const { supabase } = auth;
    const body = await request.json() as PatchBody;

    const updates = buildUpdates(body);
    if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from("portfolios").update(updates).eq("id", id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (body.deletedMediaIds && body.deletedMediaIds.length > 0) {
        await supabase.from("portfolio_media").delete().in("id", body.deletedMediaIds);
    }

    if (body.categoryIds !== undefined) {
        await syncCategories(supabase, id, body.categoryIds);
    }

    return NextResponse.json({ success: true });
}

/** DELETE /api/admin/portfolios/[id] — 포트폴리오 소프트 삭제 */
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const { error } = await auth.supabase
        .from("portfolios")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
