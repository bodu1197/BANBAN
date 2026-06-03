import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { estimateReadingTime, generateExcerpt, generateMetaDescription } from "@/lib/board/utils";

const ENCYCLOPEDIA_CACHE_TAG = "encyclopedia";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_KEYS = new Set([
  "title",
  "category",
  "content",
  "cover_image_url",
  "cover_image_alt",
  "inline_images",
  "published",
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: "잘못된 ID" }, { status: 400 });

  const body = (await request.json()) as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    // eslint-disable-next-line security/detect-object-injection -- k 는 ALLOWED_KEYS(상수 허용 키 Set) 통과만 할당되므로 안전
    if (ALLOWED_KEYS.has(k)) updates[k] = v;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "수정할 항목이 없습니다." }, { status: 400 });
  }

  if (typeof updates.content === "string") {
    const content = updates.content as string;
    updates.reading_time_minutes = estimateReadingTime(content);
    updates.excerpt = generateExcerpt(content);
    updates.meta_description = generateMetaDescription(content);
  }
  if (typeof updates.title === "string") {
    updates.meta_title = (updates.title as string).trim();
  }

  const { data, error } = await auth.supabase
    .from("encyclopedia_articles")
    .update(updates)
    .eq("id", id)
    .select("id, slug, title")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateTag(ENCYCLOPEDIA_CACHE_TAG, { expire: 0 });
  return NextResponse.json({ article: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: "잘못된 ID" }, { status: 400 });

  const { error } = await auth.supabase
    .from("encyclopedia_articles")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateTag(ENCYCLOPEDIA_CACHE_TAG, { expire: 0 });
  return NextResponse.json({ ok: true });
}
