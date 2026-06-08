import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { estimateReadingTime, generateExcerpt, generateMetaDescription } from "@/lib/board/utils";
import { notifySearchEngines } from "@/lib/utils/search-notify";

type ArticleInsert = Database["public"]["Tables"]["encyclopedia_articles"]["Insert"];

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

function validateArticleBody(body: ArticleBody): NextResponse | null {
  if (!body.title?.trim()) return NextResponse.json({ error: "제목을 입력하세요." }, { status: 400 });
  if (!body.category?.trim()) return NextResponse.json({ error: "카테고리를 입력하세요." }, { status: 400 });
  if (!body.content?.trim()) return NextResponse.json({ error: "본문을 입력하세요." }, { status: 400 });
  return null;
}

function buildInsertRow(body: ArticleBody, slug: string): ArticleInsert {
  const title = (body.title as string).trim();
  const content = (body.content as string).trim();
  return {
    slug,
    title,
    category: (body.category as string).trim(),
    content,
    excerpt: generateExcerpt(content),
    meta_title: title,
    meta_description: generateMetaDescription(content),
    cover_image_url: body.cover_image_url ?? null,
    cover_image_alt: body.cover_image_alt ?? null,
    inline_images: body.inline_images ?? [],
    keywords: [] as string[],
    tags: [] as string[],
    faq: [] as Array<{ question: string; answer: string }>,
    reading_time_minutes: estimateReadingTime(content),
    published: body.published ?? true,
    topic_id: null,
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as ArticleBody;

  const validationError = validateArticleBody(body);
  if (validationError) return validationError;

  const slug = await uniqueSlug(auth.supabase, slugify((body.title as string).trim()));
  const insertRow = buildInsertRow(body, slug);

  const { data, error } = await auth.supabase
    .from("encyclopedia_articles")
    .insert(insertRow)
    .select("id, slug, title")
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });

  revalidateTag(ENCYCLOPEDIA_CACHE_TAG, { expire: 0 });
  const savedSlug = (data as Record<string, unknown>).slug;
  if (typeof savedSlug === "string") {
    notifySearchEngines([
      `/encyclopedia/${savedSlug}`,
      "/encyclopedia",
      "/community?tab=beautylab",
    ]);
  }
  return NextResponse.json({ article: data });
}
