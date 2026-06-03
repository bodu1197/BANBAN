import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin-guard";

const ENCYCLOPEDIA_CACHE_TAG = "encyclopedia";
const INVALID_UUID_MESSAGE = "유효한 UUID 형식이 아닙니다.";

interface InlineImage { url: string; alt?: string }

interface ArticlePatchBody {
  slug?: string;
  title?: string;
  category?: string;
  content?: string;
  excerpt?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  cover_image_url?: string | null;
  cover_image_alt?: string | null;
  inline_images?: InlineImage[];
  keywords?: string[];
  tags?: string[];
  faq?: unknown;
  reading_time_minutes?: number;
  published?: boolean;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_REGEX = /^[a-z0-9가-힣ㄱ-ㅎㅏ-ㅣ\-_]+$/i;
const ARTICLE_COLUMNS = "id, slug, title, category, excerpt, content, cover_image_url, cover_image_alt, inline_images, keywords, tags, faq, meta_title, meta_description, reading_time_minutes, published, published_at, view_count, topic_id, created_at, updated_at";
const ALLOWED_KEYS: ReadonlyArray<keyof ArticlePatchBody> = [
  "slug", "title", "category", "content", "excerpt", "meta_title", "meta_description",
  "cover_image_url", "cover_image_alt", "inline_images", "keywords", "tags", "faq",
  "reading_time_minutes", "published",
];

function buildUpdates(body: ArticlePatchBody): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED_KEYS) {
    // eslint-disable-next-line security/detect-object-injection -- key from ALLOWED_KEYS allow-list
    if (body[key] !== undefined) {
      // eslint-disable-next-line security/detect-object-injection -- key from ALLOWED_KEYS allow-list
      updates[key] = body[key];
    }
  }
  // updated_at 자동 갱신
  updates.updated_at = new Date().toISOString();
  return updates;
}

/** GET /api/admin/encyclopedia/articles/[id] — 단일 글 조회 (admin 편집용) */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: INVALID_UUID_MESSAGE }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("encyclopedia_articles")
    .select(ARTICLE_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ article: data });
}

/** PATCH /api/admin/encyclopedia/articles/[id] — 글 수정 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: INVALID_UUID_MESSAGE }, { status: 400 });
  }

  const body = await request.json() as ArticlePatchBody;

  if (body.slug !== undefined) {
    if (!body.slug.trim() || !SLUG_REGEX.test(body.slug)) {
      return NextResponse.json({ error: "slug 형식이 올바르지 않습니다." }, { status: 400 });
    }
    // slug 중복 검증 (자기 자신 제외)
    const { data: dup } = await auth.supabase
      .from("encyclopedia_articles")
      .select("id")
      .eq("slug", body.slug)
      .neq("id", id)
      .maybeSingle();
    if (dup) return NextResponse.json({ error: "이미 사용 중인 slug 입니다." }, { status: 409 });
  }

  const updates = buildUpdates(body);
  if (Object.keys(updates).length === 1) {
    // updated_at 만 있음 = 실제 변경 없음
    return NextResponse.json({ error: "변경할 필드가 없습니다." }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("encyclopedia_articles")
    .update(updates)
    .eq("id", id)
    .select(ARTICLE_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateTag(ENCYCLOPEDIA_CACHE_TAG, { expire: 0 });
  return NextResponse.json({ article: data });
}

/** DELETE /api/admin/encyclopedia/articles/[id] — 글 삭제. 본문 이미지 storage 파일은 다른 작품과 공유 가능성 — 손대지 않음. */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: INVALID_UUID_MESSAGE }, { status: 400 });
  }

  const { error } = await auth.supabase
    .from("encyclopedia_articles")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateTag(ENCYCLOPEDIA_CACHE_TAG, { expire: 0 });
  return NextResponse.json({ success: true });
}
