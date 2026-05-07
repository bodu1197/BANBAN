import { callOpenAiJson } from "@/lib/cron-jobs/openai-helper";

export interface InsightArtistContext {
  artist_id: string;
  artist_name: string;
  type_artist: "TATTOO" | "SEMI_PERMANENT" | string;
  region_name: string | null;
  portfolio_count: number;
  specialties: string[]; // top categories
  cover_image_url: string | null;
}

export interface GeneratedInsight {
  title: string;
  summary: string;
  meta_description: string;
  content: string;
  tags: string[];
  specialties: string[];
}

interface RawAi {
  title?: string;
  summary?: string;
  meta_description?: string;
  introduction?: string;
  sections?: { heading: string; body: string }[];
  conclusion?: string;
  tags?: string[];
}

function buildPrompt(ctx: InsightArtistContext): string {
  const kind = "반영구 메이크업";
  return [
    `당신은 한국 ${kind} 매거진의 에디터입니다.`,
    `다음 아티스트를 소개하는 700~1000자 분량의 한국어 SEO 인사이트 글을 작성하세요.`,
    ``,
    `# 아티스트 정보`,
    `- 아티스트명: ${ctx.artist_name}`,
    `- 분야: ${kind}`,
    ctx.region_name ? `- 지역: ${ctx.region_name}` : "",
    `- 포트폴리오 수: ${ctx.portfolio_count}점`,
    ctx.specialties.length > 0 ? `- 주요 카테고리: ${ctx.specialties.join(", ")}` : "",
    ``,
    `# 작성 규칙`,
    `1. 한국어로만 작성. 외국어 절대 금지.`,
    `2. 스타일 분석, 강점, 추천 포인트, 종합 평가를 포함.`,
    `3. 가격·예약·연락처·특정샵 추천 금지.`,
    `4. 짧은 문단(2~4문장), ## 소제목 활용.`,
    ``,
    `# 출력 형식 (반드시 valid JSON)`,
    `{`,
    `  "title": "60자 이내 제목",`,
    `  "summary": "2~3문장 요약",`,
    `  "meta_description": "150자 이내 SEO 설명",`,
    `  "introduction": "도입 1~2문단",`,
    `  "sections": [`,
    `    { "heading": "스타일 & 기법 분석", "body": "..." },`,
    `    { "heading": "강점과 고유한 특징", "body": "..." },`,
    `    { "heading": "추천 포인트", "body": "..." }`,
    `  ],`,
    `  "conclusion": "종합 추천 1문단",`,
    `  "tags": ["해시태그 5~8개"]`,
    `}`,
  ].filter(Boolean).join("\n");
}

function buildContent(raw: RawAi): string {
  const lines: string[] = [];
  if (raw.introduction) lines.push(raw.introduction.trim(), "");
  for (const s of raw.sections ?? []) {
    lines.push(`## ${s.heading}`, "", s.body.trim(), "");
  }
  if (raw.conclusion) lines.push("## 종합 추천", "", raw.conclusion.trim(), "");
  return lines.join("\n").trim();
}

export function buildInsightSlug(artistName: string, artistId: string): string {
  const base = artistName
    .normalize("NFC")
    .replace(/[^가-힣A-Za-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = artistId.slice(0, 8);
  return base ? `${base}-${suffix}` : `insight-${suffix}`;
}

export async function generateInsight(
  ctx: InsightArtistContext,
): Promise<GeneratedInsight> {
  const raw = await callOpenAiJson<RawAi>(buildPrompt(ctx));
  return {
    title: raw.title?.trim() || `${ctx.artist_name} 인사이트`,
    summary: raw.summary?.trim() ?? "",
    meta_description: raw.meta_description?.trim() ?? "",
    content: buildContent(raw),
    tags: Array.isArray(raw.tags) ? raw.tags.slice(0, 10) : [],
    specialties: ctx.specialties.slice(0, 6),
  };
}
