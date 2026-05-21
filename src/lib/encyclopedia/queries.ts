import "server-only";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/server";

export async function fetchPublishedTopicIds(): Promise<Set<number>> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types
  const { data } = await (supabase as any)
    .from("encyclopedia_articles")
    .select("topic_id");
  return new Set(((data ?? []) as { topic_id: number }[]).map((r) => r.topic_id));
}

export async function insertEncyclopediaArticle(
  article: Record<string, unknown>,
): Promise<{ id: string } | { error: string }> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types
  const { data, error } = await (supabase as any)
    .from("encyclopedia_articles")
    .insert(article)
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: (data as { id: string }).id };
}

const ENCYCLOPEDIA_BUCKET = "encyclopedia";
const THUMBNAIL_WIDTH = 1200;
const THUMBNAIL_HEIGHT = 630;
const THUMBNAIL_QUALITY = 85;
const TEXT_PANEL_WIDTH = 600;
const IMAGE_PANEL_WIDTH = THUMBNAIL_WIDTH - TEXT_PANEL_WIDTH;
const PANEL_PADDING = 40;
const TITLE_MAX_LENGTH = 120;
const BG_COLOR = { r: 26, g: 26, b: 46 };

type EncyclopediaCategory = "눈썹" | "아이라인" | "입술" | "헤어라인" | "속눈썹" | "관리" | "안전" | "트렌드" | "기타";

const CATEGORY_COLORS: Record<EncyclopediaCategory, string> = {
  눈썹: "#E8C9A0",
  아이라인: "#B8A8D0",
  입술: "#E8A0A0",
  헤어라인: "#A0C8E8",
  속눈썹: "#C0B0E8",
  관리: "#A0E8C8",
  안전: "#E8D8A0",
  트렌드: "#E8A0D0",
  기타: "#C8C8C8",
};

function escapePango(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildPangoMarkup(title: string, category: string): string {
  const catColor = CATEGORY_COLORS[category as EncyclopediaCategory] ?? CATEGORY_COLORS["기타"];
  const safeTitle = escapePango(title.slice(0, TITLE_MAX_LENGTH));
  const safeCat = escapePango(category);
  return [
    `<span foreground="${catColor}" size="16pt" weight="bold">${safeCat}</span>`,
    "",
    `<span foreground="white" size="24pt" weight="bold">${safeTitle}</span>`,
    "",
    "",
    "",
    "",
    `<span foreground="#aaaaaa" size="11pt">반언니 백과사전</span>`,
  ].join("\n");
}

async function renderTextPanel(title: string, category: string): Promise<Buffer> {
  const textRaw = await sharp({
    text: {
      text: buildPangoMarkup(title, category),
      width: TEXT_PANEL_WIDTH - PANEL_PADDING * 2,
      rgba: true,
    },
  }).png().toBuffer();

  return sharp({
    create: {
      width: TEXT_PANEL_WIDTH,
      height: THUMBNAIL_HEIGHT,
      channels: 4 as const,
      background: { ...BG_COLOR, alpha: 255 },
    },
  })
    .composite([{ input: textRaw, left: PANEL_PADDING, top: PANEL_PADDING }])
    .png()
    .toBuffer();
}

async function composeThumbnail(
  imageBuffer: Buffer,
  title: string,
  category: string,
): Promise<Buffer> {
  const [textPanel, rightImage] = await Promise.all([
    renderTextPanel(title, category),
    sharp(imageBuffer)
      .resize(IMAGE_PANEL_WIDTH, THUMBNAIL_HEIGHT, { fit: "cover" })
      .toBuffer(),
  ]);

  return sharp({
    create: {
      width: THUMBNAIL_WIDTH,
      height: THUMBNAIL_HEIGHT,
      channels: 3 as const,
      background: BG_COLOR,
    },
  })
    .composite([
      { input: textPanel, left: 0, top: 0 },
      { input: rightImage, left: TEXT_PANEL_WIDTH, top: 0 },
    ])
    .webp({ quality: THUMBNAIL_QUALITY })
    .toBuffer();
}

export async function uploadThumbnailToStorage(
  imageBuffer: Buffer,
  topicId: number,
  slug: string,
  title: string = "",
  category: string = "",
): Promise<string> {
  const supabase = createAdminClient();
  const fileName = `thumbnails/${slug}-${topicId}.webp`;

  const webpBuffer = (title && category)
    ? await composeThumbnail(imageBuffer, title, category)
    : await sharp(imageBuffer)
        .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, { fit: "cover" })
        .webp({ quality: THUMBNAIL_QUALITY })
        .toBuffer();

  const { error } = await supabase.storage
    .from(ENCYCLOPEDIA_BUCKET)
    .upload(fileName, webpBuffer, {
      contentType: "image/webp",
      upsert: true,
    });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const baseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  return `${baseUrl}/storage/v1/object/public/${ENCYCLOPEDIA_BUCKET}/${fileName}`;
}

type MediaRow = { portfolio_id: string; storage_path: string };

const CATEGORY_BRIDGE_MULTIPLIER = 8;
const RANDOM_POOL_MULTIPLIER = 3;
const MEDIA_FETCH_MULTIPLIER = 3;

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const FEMALE_ROOT = "여성 뷰티";
const MALE_ROOT = "남성 뷰티";

async function getGenderCategoryIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase admin client
  supabase: any,
  gender: "여성" | "남성",
): Promise<Set<string>> {
  const rootName = gender === "남성" ? MALE_ROOT : FEMALE_ROOT;
  const { data: roots } = await supabase
    .from("categories")
    .select("id")
    .eq("name", rootName)
    .is("parent_id", null)
    .limit(1);
  if (!roots?.length) return new Set();
  const rootId = (roots as { id: string }[])[0].id;

  const { data: children } = await supabase
    .from("categories")
    .select("id")
    .eq("parent_id", rootId);
  const childIds = ((children ?? []) as { id: string }[]).map((c) => c.id);

  const { data: grandchildren } = childIds.length > 0
    ? await supabase.from("categories").select("id").in("parent_id", childIds)
    : { data: [] };
  const grandchildIds = ((grandchildren ?? []) as { id: string }[]).map((c) => c.id);

  return new Set([rootId, ...childIds, ...grandchildIds]);
}

async function findCategoryPortfolioIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase admin client
  supabase: any,
  cleaned: string,
  limit: number,
  gender: "여성" | "남성",
): Promise<string[]> {
  const [catResult, genderIds] = await Promise.all([
    supabase.from("categories").select("id").ilike("name", `%${cleaned}%`).limit(10),
    getGenderCategoryIds(supabase, gender),
  ]);
  const catRows = catResult.data as { id: string }[] | null;
  if (!catRows || catRows.length === 0) return [];

  const catIds = catRows.map((c) => c.id).filter((id) => genderIds.has(id));
  if (catIds.length === 0) return [];

  const { data: bridge } = await supabase
    .from("categorizables")
    .select("categorizable_id")
    .eq("categorizable_type", "portfolio")
    .in("category_id", catIds)
    .limit(limit * CATEGORY_BRIDGE_MULTIPLIER);

  const rawIds = Array.from(
    new Set(((bridge ?? []) as { categorizable_id: string }[]).map((b) => b.categorizable_id)),
  );
  if (rawIds.length === 0) return [];

  const { data: active } = await supabase
    .from("portfolios")
    .select("id")
    .in("id", rawIds)
    .is("deleted_at", null);

  return ((active ?? []) as { id: string }[]).map((p) => p.id);
}

async function pickRandomActivePortfolioIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase admin client
  supabase: any,
  count: number,
): Promise<string[]> {
  const { data } = await supabase
    .from("portfolios")
    .select("id")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(count * RANDOM_POOL_MULTIPLIER);

  const ids = ((data ?? []) as { id: string }[]).map((p) => p.id);
  return shuffle(ids).slice(0, count);
}

export async function pickRelatedPortfolioImages(
  keyword: string,
  limit: number = 4,
  gender: "여성" | "남성" = "여성",
): Promise<{ url: string; alt: string }[]> {
  const supabase = createAdminClient();
  const bucketUrl = `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim()}/storage/v1/object/public/portfolios`;
  const cleaned = keyword.replace(/\s*(타투|반영구)\s*$/, "").trim();

  const effectiveKeyword = cleaned || keyword;
  let portfolioIds = await findCategoryPortfolioIds(supabase, cleaned, limit, gender);
  if (portfolioIds.length === 0) {
    portfolioIds = await pickRandomActivePortfolioIds(supabase, limit * MEDIA_FETCH_MULTIPLIER);
  }
  if (portfolioIds.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types
  const { data: imgs } = await (supabase as any)
    .from("portfolio_media")
    .select("portfolio_id, storage_path")
    .in("portfolio_id", portfolioIds)
    .order("order_index", { ascending: true })
    .limit(limit * MEDIA_FETCH_MULTIPLIER);

  const byPortfolio = new Map<string, string>();
  for (const row of (imgs ?? []) as MediaRow[]) {
    if (!byPortfolio.has(row.portfolio_id)) {
      byPortfolio.set(row.portfolio_id, row.storage_path);
    }
  }

  const ordinals = ["대표", "두 번째", "세 번째", "네 번째", "다섯 번째"];
  return shuffle(Array.from(byPortfolio.entries()))
    .slice(0, limit)
    .map(([, path], i) => ({
      url: `${bucketUrl}/${path}`,
      alt: `${effectiveKeyword} ${ordinals[i] ?? `${i + 1}번째`} 작품 예시`,
    }));
}
