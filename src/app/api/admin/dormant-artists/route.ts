import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { escapeIlike } from "@/lib/supabase/queries";

const LIMIT = 20;

interface DormantRow {
  id: string; user_id: string; title: string; profile_image_path: string | null;
  portfolio_media_count: number; created_at: string; updated_at: string;
}

interface ProfileInfo { nickname: string; lastLoginAt: string | null }

async function fetchProfileMap(supabase: SupabaseClient, ids: string[]): Promise<Map<string, ProfileInfo>> {
  const map = new Map<string, ProfileInfo>();
  if (ids.length === 0) return map;
  const { data } = await supabase.from("profiles").select("id, nickname, last_login_at").in("id", ids);
  for (const p of (data ?? []) as { id: string; nickname: string; last_login_at: string | null }[]) {
    map.set(p.id, { nickname: p.nickname ?? "알 수 없음", lastLoginAt: p.last_login_at });
  }
  return map;
}

function isLoginSort(sort: string | null): boolean {
  return sort === "last_login_at_asc" || sort === "last_login_at_desc";
}

function sortByLogin(items: DormantResult[], ascending: boolean): DormantResult[] {
  return [...items].sort((a, b) => {
    const ta = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
    const tb = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
    return ascending ? ta - tb : tb - ta;
  });
}

interface DormantResult {
  id: string; userId: string; title: string; nickname: string;
  portfolioCount: number; dormantSince: string; createdAt: string; lastLoginAt: string | null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const search = (searchParams.get("search") ?? "").trim();
  const sort = searchParams.get("sort");
  const offset = (page - 1) * LIMIT;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- portfolio_media_count not in generated types
  let query = (auth.supabase as any)
    .from("artists")
    .select("id, user_id, title, profile_image_path, portfolio_media_count, created_at, updated_at", { count: "exact" })
    .eq("status", "dormant")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .range(offset, offset + LIMIT - 1);

  if (search) query = query.ilike("title", `%${escapeIlike(search)}%`);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const artists = (data ?? []) as DormantRow[];
  const userIds = artists.map((a) => a.user_id);
  const profileMap = await fetchProfileMap(auth.supabase, userIds);

  let result: DormantResult[] = artists.map((a) => {
    const info = profileMap.get(a.user_id);
    return {
      id: a.id, userId: a.user_id, title: a.title,
      nickname: info?.nickname ?? "알 수 없음",
      portfolioCount: a.portfolio_media_count, dormantSince: a.updated_at,
      createdAt: a.created_at, lastLoginAt: info?.lastLoginAt ?? null,
    };
  });

  if (isLoginSort(sort)) {
    result = sortByLogin(result, sort === "last_login_at_asc");
  }

  return NextResponse.json({ artists: result, total: count ?? 0, page, limit: LIMIT });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json() as { id: string; action: "reactivate" };
  if (body.action !== "reactivate") {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- status not in generated types
  const { error } = await (auth.supabase as any)
    .from("artists")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", body.id)
    .eq("status", "dormant");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json() as { action: string };
  if (body.action !== "scan") {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types
  const { data, error } = await (auth.supabase as any).rpc("mark_dormant_artists");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, marked: data as number });
}
