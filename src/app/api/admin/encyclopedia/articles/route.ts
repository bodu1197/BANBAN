import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin-guard";

const ENCYCLOPEDIA_CACHE_TAG = "encyclopedia";

interface InlineImage { url: string; alt?: string }

interface ArticleBody {
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

const SLUG_REGEX = /^[a-z0-9가-힣ㄱ-ㅎㅏ-ㅣ\-_]+$/i;
const ARTICLE_COLUMNS = "id, slug, title, category, excerpt, content, cover_image_url, cover_image_alt, inline_images, keywords, tags, faq, meta_title, meta_description, reading_time_minutes, published, published_at, view_count, topic_id, created_at, updated_at";

function estimateReadingTime(content: string): number {
  // 한글 300자/분, 영어 200단어/분 — 단순히 글자수 / 300 (최소 1분)
  const len = content.replace(/\s+/g, " ").trim().length;
  return Math.max(1, Math.ceil(len / 300));
}

function validateRequired(body: ArticleBody): string | null {
  if (!body.slug?.trim()) return "slug 가 필요합니다.";
  if (!SLUG_REGEX.test(body.slug)) return "slug 는 영문/숫자/한글/-/_ 만 사용 가능합니다.";
  if (!body.title?.trim()) return "title 이 필요합니다.";
  if (!body.category?.trim()) return "category 가 필요합니다.";
  if (!body.content?.trim()) return "content 가 필요합니다.";
  return null;
}

/** GET /api/admin/encyclopedia/articles — 목록 (검색, 페이지네이션) */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() ?? "";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const limit = 20;
  const offset = (page - 1) * limit;

  let query = auth.supabase
    .from("encyclopedia_articles")
    .select(ARTICLE_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    const s = search.replace(/[%,]/g, "");
    query = query.or(`title.ilike.%${s}%,slug.ilike.%${s}%,category.ilike.%${s}%`);
  }

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ articles: data ?? [], total: count ?? 0, page, limit });
}

/** POST /api/admin/encyclopedia/articles — 새 글 작성 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json() as ArticleBody;
  const validationError = validateRequired(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  // slug 중복 검증
  const { data: existing } = await auth.supabase
    .from("encyclopedia_articles")
    .select("id")
    .eq("slug", body.slug as string)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: "이미 사용 중인 slug 입니다." }, { status: 409 });

  const content = body.content as string;
  const insertRow = {
    slug: (body.slug as string).trim(),
    title: (body.title as string).trim(),
    category: (body.category as string).trim(),
    content,
    excerpt: body.excerpt?.trim() || null,
    meta_title: body.meta_title?.trim() || null,
    meta_description: body.meta_description?.trim() || null,
    cover_image_url: body.cover_image_url ?? null,
    cover_image_alt: body.cover_image_alt ?? null,
    inline_images: body.inline_images ?? [],
    keywords: body.keywords ?? [],
    tags: body.tags ?? [],
    faq: body.faq ?? [],
    reading_time_minutes: body.reading_time_minutes ?? estimateReadingTime(content),
    published: body.published ?? true,
    topic_id: null,
  };

  const { data, error } = await auth.supabase
    .from("encyclopedia_articles")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types not yet updated for nullable cols
    .insert(insertRow as any)
    .select(ARTICLE_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateTag(ENCYCLOPEDIA_CACHE_TAG, { expire: 0 });
  return NextResponse.json({ article: data });
}
