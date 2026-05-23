import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { estimateReadingTime, generateExcerpt, generateMetaDescription } from "@/lib/board/utils";

const ENCYCLOPEDIA_CACHE_TAG = "encyclopedia";
const SLUG_MAX_LENGTH = 80;

interface ArticleBody {
  title?: string;
  category?: string;
  content?: string;
  cover_image_url?: string | null;
  cover_image_alt?: string | null;
  inline_images?: { url: string; alt?: string }[];
  published?: boolean;
}

function slugify(title: string): string {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9가-힣ㄱ-ㅎㅏ-ㅣ\-]/g, "")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, SLUG_MAX_LENGTH) || "untitled"
  );
}

async function uniqueSlug(supabase: SupabaseClient<Database>, base: string): Promise<string> {
  const { data: existing } = await supabase
    .from("encyclopedia_articles")
    .select("slug")
    .like("slug", `${base}%`)
    .limit(200);

  const taken = new Set(((existing ?? []) as { slug: string }[]).map((r) => r.slug));
  if (!taken.has(base)) return base;

  for (let i = 2; i <= 200; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as ArticleBody;

  if (!body.title?.trim()) return NextResponse.json({ error: "제목을 입력하세요." }, { status: 400 });
  if (!body.category?.trim()) return NextResponse.json({ error: "카테고리를 입력하세요." }, { status: 400 });
  if (!body.content?.trim()) return NextResponse.json({ error: "본문을 입력하세요." }, { status: 400 });

  const title = body.title.trim();
  const content = body.content.trim();
  const slug = await uniqueSlug(auth.supabase, slugify(title));

  const insertRow = {
    slug,
    title,
    category: body.category.trim(),
    content,
    excerpt: generateExcerpt(content),
    meta_title: title,
    meta_description: generateMetaDescription(content),
    cover_image_url: body.cover_image_url ?? null,
    cover_image_alt: body.cover_image_alt ?? null,
    inline_images: body.inline_images ?? [],
    keywords: [],
    tags: [],
    faq: [],
    reading_time_minutes: estimateReadingTime(content),
    published: body.published ?? true,
    topic_id: null,
  };

  const { data, error } = await auth.supabase
    .from("encyclopedia_articles")
    .insert(insertRow)
    .select("id, slug, title")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateTag(ENCYCLOPEDIA_CACHE_TAG, { expire: 0 });
  return NextResponse.json({ article: data });
}
