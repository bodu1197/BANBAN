import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/supabase/admin-guard";

const LIMIT = 20;

interface CourseRow {
  id: string; artist_id: string; title: string; category: string;
  class_type: string; price: number; is_active: boolean; created_at: string;
}

async function buildArtistNameMap(supabase: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const { data } = await supabase.from("profiles").select("id, nickname").in("id", ids);
  for (const p of data ?? []) map.set(p.id, p.nickname ?? "알 수 없음");
  return map;
}

function mapCourseRows(courses: CourseRow[], nameMap: Map<string, string>): Array<Record<string, unknown>> {
  return courses.map((c) => ({
    id: c.id, title: c.title, category: c.category, classType: c.class_type,
    price: c.price, isActive: c.is_active, artistName: nameMap.get(c.artist_id) ?? "알 수 없음", createdAt: c.created_at,
  }));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const search = (searchParams.get("search") ?? "").trim();
  const offset = (page - 1) * LIMIT;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- courses not in generated types
  const db = auth.supabase as any;
  let query = db.from("courses")
    .select("id, artist_id, title, category, class_type, price, is_active, created_at", { count: "exact" })
    .order("created_at", { ascending: false }).range(offset, offset + LIMIT - 1);
  if (search) query = query.ilike("title", `%${search}%`);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const courses = (data ?? []) as CourseRow[];
  const nameMap = await buildArtistNameMap(auth.supabase, [...new Set(courses.map((c) => c.artist_id))]);

  return NextResponse.json({ courses: mapCourseRows(courses, nameMap), total: count ?? 0, page, limit: LIMIT });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json() as { id: string; is_active?: boolean };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabase as any;

  const updates: Record<string, unknown> = {};
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  const { error } = await db.from("courses").update(updates).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json() as { id: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabase as any;

  await Promise.all([
    db.from("course_images").delete().eq("course_id", body.id),
    db.from("course_highlights").delete().eq("course_id", body.id),
    db.from("course_curriculum").delete().eq("course_id", body.id),
    db.from("course_reviews").delete().eq("course_id", body.id),
  ]);

  const { error } = await db.from("courses").delete().eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
