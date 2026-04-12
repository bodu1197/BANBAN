import { callOpenAiJson } from "@/lib/cron-jobs/openai-helper";

export interface BlogPortfolioContext {
  portfolio_id: string;
  portfolio_title: string;
  portfolio_description: string | null;
  artist_id: string;
  artist_name: string;
  region_name: string | null;
  category_name: string | null;
  image_url: string | null;
}

export interface GeneratedBlogPost {
  title: string;
  meta_description: string;
  content: string; // Markdown
  tags: string[];
}

interface RawAi {
  title?: string;
  meta_description?: string;
  introduction?: string;
  sections?: { heading: string; body: string }[];
  conclusion?: string;
  tags?: string[];
}

function buildPrompt(ctx: BlogPortfolioContext): string {
  return [
    `당신은 한국 타투 매거진의 에디터입니다.`,
    `다음 포트폴리오를 소개하는 600~900자 분량의 한국어 SEO 블로그 글을 작성하세요.`,
    ``,
    `# 포트폴리오 정보`,
    `- 작품 제목: ${ctx.portfolio_title}`,
    ctx.portfolio_description ? `- 작품 설명: ${ctx.portfolio_description}` : "",
    `- 아티스트: ${ctx.artist_name}`,
    ctx.region_name ? `- 지역: ${ctx.region_name}` : "",
    ctx.category_name ? `- 카테고리: ${ctx.category_name}` : "",
    ``,
    `# 작성 규칙`,
    `1. 한국어로만 작성. 영어/일본어/중국어 절대 금지.`,
    `2. SEO: 카테고리, 지역, 아티스트명을 자연스럽게 포함.`,
    `3. 디자인 분석, 아티스트 강점, 추천 포인트를 포함.`,
    `4. 광고성 문구·가격 언급·특정샵 추천 금지.`,
    `5. 짧은 문단(2~4문장), ## 소제목 활용.`,
    ``,
    `# 출력 형식 (반드시 valid JSON)`,
    `{`,
    `  "title": "60자 이내 매력적 제목",`,
    `  "meta_description": "150자 이내 SEO 설명",`,
    `  "introduction": "도입 1~2문단",`,
    `  "sections": [`,
    `    { "heading": "디자인 분석", "body": "..." },`,
    `    { "heading": "아티스트 강점", "body": "..." },`,
    `    { "heading": "추천 포인트", "body": "..." }`,
    `  ],`,
    `  "conclusion": "마무리 1문단",`,
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
  if (raw.conclusion) {
    lines.push("## 마치며", "", raw.conclusion.trim(), "");
  }
  return lines.join("\n").trim();
}

export function buildBlogSlug(title: string, portfolioId: string): string {
  const base = title
    .normalize("NFC")
    .replace(/[^가-힣A-Za-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const suffix = portfolioId.slice(0, 8);
  return base ? `${base}-${suffix}` : `blog-${suffix}`;
}

export async function generateBlogPost(
  ctx: BlogPortfolioContext,
): Promise<GeneratedBlogPost> {
  const raw = await callOpenAiJson<RawAi>(buildPrompt(ctx));
  return {
    title: raw.title?.trim() || ctx.portfolio_title,
    meta_description: raw.meta_description?.trim() ?? "",
    content: buildContent(raw),
    tags: Array.isArray(raw.tags) ? raw.tags.slice(0, 10) : [],
  };
}
