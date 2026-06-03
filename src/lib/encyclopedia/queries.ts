import "server-only";
import path from "path";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/server";
import { escapeLikePattern } from "@/lib/supabase/query-utils";
import type { Database } from "@/types/database";

export async function fetchPublishedTopicIds(): Promise<Set<number>> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("encyclopedia_articles")
    .select("topic_id");
  return new Set(((data ?? []) as { topic_id: number }[]).map((r) => r.topic_id));
}

export async function insertEncyclopediaArticle(
  article: Database["public"]["Tables"]["encyclopedia_articles"]["Insert"],
): Promise<{ id: string } | { error: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
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
const FONT_PATH = path.join(process.cwd(), "src/lib/encyclopedia/fonts/NotoSansKR.ttf");

const BG_PALETTE: readonly { r: number; g: number; b: number }[] = [
  { r: 26, g: 26, b: 46 },
  { r: 18, g: 40, b: 44 },
  { r: 44, g: 20, b: 30 },
  { r: 20, g: 36, b: 28 },
  { r: 38, g: 22, b: 46 },
  { r: 30, g: 34, b: 44 },
  { r: 42, g: 28, b: 18 },
  { r: 24, g: 24, b: 50 },
  { r: 36, g: 38, b: 22 },
  { r: 48, g: 20, b: 30 },
];

function pickBgColor(topicId: number): { r: number; g: number; b: number } {
  return BG_PALETTE[topicId % BG_PALETTE.length];
}

function escapePango(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const MAIN_MAX_PT = 130;
const MAIN_MIN_PT = 60;
const SUB_MAX_PT = 56;
const SUB_MIN_PT = 32;
const TITLE_GAP = 20;
const MAIN_HEIGHT_RATIO = 0.7;
const FONT_SIZE_STEP = 4;
const SUB_TEXT_COLOR = "#FF8C6B";
// NotoSansKR 기준 — 글자 폭 ≈ pt × 1.05, 공백 ≈ 글자 폭 × 0.35
const CHAR_WIDTH_RATIO = 1.05;
const SPACE_WIDTH_RATIO = 0.35;

function wrapKorean(text: string, ptSize: number, maxWidth: number): string {
  const charPx = ptSize * CHAR_WIDTH_RATIO;
  const spacePx = charPx * SPACE_WIDTH_RATIO;
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  let lineW = 0;

  for (const word of words) {
    const wordW = word.length * charPx;
    const gap = line ? spacePx : 0;
    if (lineW + gap + wordW <= maxWidth) {
      line += (line ? " " : "") + word;
      lineW += gap + wordW;
    } else {
      if (line) lines.push(line);
      line = word;
      lineW = wordW;
    }
  }
  if (line) lines.push(line);
  return lines.join("\n");
}

async function renderPangoText(
  markup: string,
  maxWidth: number,
): Promise<{ buf: Buffer; w: number; h: number }> {
  const buf = await sharp({
    text: { text: markup, fontfile: FONT_PATH, width: maxWidth, rgba: true },
  }).png().toBuffer();
  const { width: w, height: h } = await sharp(buf).metadata();
  return { buf, w: w ?? 0, h: h ?? 0 };
}

async function renderWrapped(
  text: string, color: string, pt: number, maxW: number,
): Promise<{ buf: Buffer; w: number; h: number }> {
  const wrapped = wrapKorean(text, pt, maxW);
  return renderPangoText(
    `<span foreground="${color}" size="${pt}pt" weight="bold">${escapePango(wrapped)}</span>`, maxW,
  );
}

async function fitText(
  text: string, color: string, maxW: number, maxH: number, startPt: number, minPt: number,
): Promise<{ buf: Buffer; h: number; pt: number }> {
  let pt = startPt;
  let result = await renderWrapped(text, color, pt, maxW);
  while (result.h > maxH && pt > minPt) {
    pt -= FONT_SIZE_STEP;
    result = await renderWrapped(text, color, pt, maxW);
  }
  return { buf: result.buf, h: result.h, pt };
}

async function renderTextPanel(title: string, topicId: number): Promise<Buffer> {
  const bg = pickBgColor(topicId);
  const maxW = TEXT_PANEL_WIDTH - PANEL_PADDING * 2;
  const maxH = THUMBNAIL_HEIGHT - PANEL_PADDING * 2;
  const trimmed = title.slice(0, TITLE_MAX_LENGTH);
  const colonIdx = trimmed.indexOf(":");

  let layers: { input: Buffer; left: number; top: number }[];

  if (colonIdx > 0 && colonIdx < trimmed.length - 1) {
    const mainText = escapePango(trimmed.slice(0, colonIdx).trim());
    const subText = escapePango(trimmed.slice(colonIdx + 1).trim());
    const mainMaxH = Math.round(maxH * MAIN_HEIGHT_RATIO);

    const main = await fitText(mainText, "white", maxW, mainMaxH, MAIN_MAX_PT, MAIN_MIN_PT);
    const subMaxH = maxH - main.h - TITLE_GAP;
    const sub = await fitText(subText, SUB_TEXT_COLOR, maxW, subMaxH, SUB_MAX_PT, SUB_MIN_PT);

    const totalH = main.h + TITLE_GAP + sub.h;
    const startY = Math.max(PANEL_PADDING, Math.round((THUMBNAIL_HEIGHT - totalH) / 2));
    layers = [
      { input: main.buf, left: PANEL_PADDING, top: startY },
      { input: sub.buf, left: PANEL_PADDING, top: startY + main.h + TITLE_GAP },
    ];
  } else {
    const single = await fitText(escapePango(trimmed), "white", maxW, maxH, MAIN_MAX_PT, MAIN_MIN_PT);
    const topOffset = Math.max(PANEL_PADDING, Math.round((THUMBNAIL_HEIGHT - single.h) / 2));
    layers = [{ input: single.buf, left: PANEL_PADDING, top: topOffset }];
  }

  return sharp({
    create: { width: TEXT_PANEL_WIDTH, height: THUMBNAIL_HEIGHT, channels: 4 as const, background: { ...bg, alpha: 255 } },
  })
    .composite(layers)
    .png()
    .toBuffer();
}

async function composeThumbnail(
  imageBuffer: Buffer,
  title: string,
  topicId: number,
): Promise<Buffer> {
  const bg = pickBgColor(topicId);
  const [textPanel, rightImage] = await Promise.all([
    renderTextPanel(title, topicId),
    sharp(imageBuffer)
      .resize(IMAGE_PANEL_WIDTH, THUMBNAIL_HEIGHT, { fit: "cover" })
      .toBuffer(),
  ]);

  return sharp({
    create: {
      width: THUMBNAIL_WIDTH,
      height: THUMBNAIL_HEIGHT,
      channels: 3 as const,
      background: bg,
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
): Promise<string> {
  const supabase = createAdminClient();
  const fileName = `thumbnails/${slug}-${topicId}.webp`;

  const webpBuffer = title
    ? await composeThumbnail(imageBuffer, title, topicId)
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
  // SonarCloud S2245 회피 — Math.random 대신 crypto-backed shuffle. lib/random.ts 의 secureShuffle 와 동일 로직.
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const j = buf[0] % (i + 1);
    // eslint-disable-next-line security/detect-object-injection -- 숫자 인덱스 i, j (Fisher-Yates 셔플 스왑)
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const FEMALE_ROOT = "여성 뷰티";
const MALE_ROOT = "남성 뷰티";

async function getGenderCategoryIds(
  supabase: ReturnType<typeof createAdminClient>,
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
  supabase: ReturnType<typeof createAdminClient>,
  cleaned: string,
  limit: number,
  gender: "여성" | "남성",
): Promise<string[]> {
  const [catResult, genderIds] = await Promise.all([
    supabase.from("categories").select("id").ilike("name", `%${escapeLikePattern(cleaned)}%`).limit(10),
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
  supabase: ReturnType<typeof createAdminClient>,
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

  const { data: imgs } = await supabase
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

  const ordinals = ["대표", "두 번째", "세 번째", "네 번째", "다섯 번째", "여섯 번째", "일곱 번째"];
  return shuffle(Array.from(byPortfolio.entries()))
    .slice(0, limit)
    .map(([, path], i) => {
      // eslint-disable-next-line security/detect-object-injection -- 숫자 인덱스 i (map 콜백 인덱스)
      const ordinal = ordinals[i] ?? `${i + 1}번째`;
      return {
        url: `${bucketUrl}/${path}`,
        alt: `${effectiveKeyword} ${ordinal} 작품 예시`,
      };
    });
}

// ── Section 별 portfolio 사진 매칭 (topic.category 기반) ──────────────────────

/**
 * topic.category 의 portfolio pool 안에서만 section 수만큼 portfolio_media 선택.
 *
 * Why: 기존 pickRelatedPortfolioImages 는 글 전체 keyword 1번 검색.
 * CLIP 임베딩 시도(ca54eb0)는 "한국어 텍스트 ↔ 시술 이미지" 의미 매칭이 약하고
 * (예: 아이라인 텍스트가 두피SMP 이미지에 더 가까운 visual similarity 매칭)
 * → 카테고리 매칭이 가장 정확. topic.category 는 ENCYCLOPEDIA_TOPICS 에 명시되어 신뢰 가능.
 *
 * How: topic.category 의 portfolio pool fetch → portfolio 별 첫 미디어 → section 수만큼
 * 다른 portfolio 의 미디어 1장씩 (중복 방지). pool 부족 시 keyword fallback.
 */
export async function pickImagesForSections(
  sections: ReadonlyArray<{ heading: string; body: string }>,
  topicCategory: string,
  fallbackKeyword: string,
  gender: "여성" | "남성" = "여성",
): Promise<{ url: string; alt: string }[]> {
  const supabase = createAdminClient();
  const bucketUrl = `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim()}/storage/v1/object/public/portfolios`;
  const needed = sections.length;

  const poolIds = await findCategoryPortfolioIds(supabase, topicCategory, needed * MEDIA_FETCH_MULTIPLIER, gender);
  if (poolIds.length === 0) {
    return pickRelatedPortfolioImages(fallbackKeyword, needed, gender);
  }

  const { data: imgs } = await supabase
    .from("portfolio_media")
    .select("portfolio_id, storage_path")
    .in("portfolio_id", poolIds)
    .order("order_index", { ascending: true });

  const byPortfolio = new Map<string, string>();
  for (const row of (imgs ?? []) as MediaRow[]) {
    if (!byPortfolio.has(row.portfolio_id)) {
      byPortfolio.set(row.portfolio_id, row.storage_path);
    }
  }

  const candidates = shuffle(Array.from(byPortfolio.values()));
  const results: { url: string; alt: string }[] = [];
  for (let i = 0; i < Math.min(needed, candidates.length); i++) {
    // eslint-disable-next-line security/detect-object-injection -- numeric index from for-loop
    const path = candidates[i];
    // eslint-disable-next-line security/detect-object-injection -- numeric index from for-loop
    const section = sections[i];
    results.push({
      url: `${bucketUrl}/${path}`,
      alt: `${section.heading} 관련 ${topicCategory} 시술 예시`,
    });
  }

  if (results.length < needed) {
    const missing = needed - results.length;
    const fallback = await pickRelatedPortfolioImages(fallbackKeyword, missing, gender);
    results.push(...fallback);
  }

  return results;
}
