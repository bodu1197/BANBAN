import { callOpenAiJson } from "@/lib/cron-jobs/openai-helper";

export interface LocationSeoContext {
  region_id: string;
  region_name: string;
  style: string;
  artist_count: number;
  portfolio_count: number;
  top_artist_names: string[]; // up to 5
  cover_image_url: string | null;
}

export interface GeneratedLocationSeo {
  title: string;
  excerpt: string;
  content: string;
  meta_title: string;
  meta_description: string;
  keywords: string[];
  faq: { question: string; answer: string }[];
  reading_time_minutes: number;
}

interface RawAi {
  title?: string;
  meta_title?: string;
  meta_description?: string;
  excerpt?: string;
  introduction?: string;
  sections?: { heading: string; body: string }[];
  conclusion?: string;
  keywords?: string[];
  faq?: { question: string; answer: string }[];
}

function buildPrompt(ctx: LocationSeoContext): string {
  return [
    `당신은 한국 타투 검색 SEO 전문가입니다.`,
    `"${ctx.region_name} ${ctx.style} 타투" 검색 의도를 만족시키는 1,200~1,800자 한국어 랜딩 페이지를 작성하세요.`,
    ``,
    `# 컨텍스트`,
    `- 지역: ${ctx.region_name}`,
    `- 스타일: ${ctx.style}`,
    `- 등록 아티스트 수: ${ctx.artist_count}명`,
    `- 등록 작품 수: ${ctx.portfolio_count}점`,
    ctx.top_artist_names.length > 0
      ? `- 대표 아티스트(언급용, 추천 금지): ${ctx.top_artist_names.join(", ")}`
      : "",
    ``,
    `# 작성 규칙`,
    `1. 한국어로만 작성. 외국어 절대 금지.`,
    `2. 지역명과 스타일명을 자연스럽게 반복(과도한 키워드 스터핑 금지).`,
    `3. 스타일 특징, 지역 특성, 시술 시 주의사항, 추천 부위, 가격대 일반론을 포함.`,
    `4. 특정샵/아티스트 강력 추천 금지. 가격은 일반적인 범위만.`,
    `5. 짧은 문단(2~4문장), ## 소제목 활용.`,
    ``,
    `# 출력 형식 (반드시 valid JSON)`,
    `{`,
    `  "title": "60자 이내 매력적 제목",`,
    `  "meta_title": "55자 이내 SEO 제목 (사이트명 포함 금지)",`,
    `  "meta_description": "150자 이내 SEO 설명",`,
    `  "excerpt": "120자 이내 발췌문",`,
    `  "introduction": "도입 2~3문단",`,
    `  "sections": [`,
    `    { "heading": "${ctx.style} 스타일의 특징", "body": "..." },`,
    `    { "heading": "${ctx.region_name}에서 받는 ${ctx.style} 타투", "body": "..." },`,
    `    { "heading": "추천 부위와 디자인", "body": "..." },`,
    `    { "heading": "시술 전 알아야 할 점", "body": "..." }`,
    `  ],`,
    `  "conclusion": "마무리 1~2문단",`,
    `  "keywords": ["검색 키워드 5~8개"],`,
    `  "faq": [`,
    `    { "question": "...", "answer": "..." },`,
    `    { "question": "...", "answer": "..." },`,
    `    { "question": "...", "answer": "..." }`,
    `  ]`,
    `}`,
  ].filter(Boolean).join("\n");
}

function buildContent(raw: RawAi, coverUrl: string | null, coverAlt: string): string {
  const lines: string[] = [];
  if (raw.introduction) lines.push(raw.introduction.trim(), "");
  if (coverUrl) lines.push(`![${coverAlt}](${coverUrl})`, "");
  for (const s of raw.sections ?? []) {
    lines.push(`## ${s.heading}`, "", s.body.trim(), "");
  }
  if (raw.conclusion) lines.push("## 마치며", "", raw.conclusion.trim(), "");
  return lines.join("\n").trim();
}

export function buildLocationSeoSlug(regionName: string, style: string): string {
  // ASCII-friendly slug. Korean is fine for SEO too but slugs prefer ascii.
  const base = `${regionName} ${style}`
    .normalize("NFC")
    .replace(/[^가-힣A-Za-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || `loc-seo-${Date.now()}`;
}

export async function generateLocationSeoPage(
  ctx: LocationSeoContext,
): Promise<GeneratedLocationSeo> {
  const raw = await callOpenAiJson<RawAi>(buildPrompt(ctx));
  const coverAlt = `${ctx.region_name} ${ctx.style} 타투`;
  const content = buildContent(raw, ctx.cover_image_url, coverAlt);
  const stripSuffix = (v?: string): string =>
    (v ?? "").replace(/\s*[-|–—]\s*반언니\s*$/u, "").trim();
  return {
    title: raw.title?.trim() || `${ctx.region_name} ${ctx.style} 타투`,
    excerpt: raw.excerpt?.trim() ?? "",
    content,
    meta_title: stripSuffix(raw.meta_title) || `${ctx.region_name} ${ctx.style} 타투`,
    meta_description: raw.meta_description?.trim() ?? "",
    keywords: Array.isArray(raw.keywords) ? raw.keywords.slice(0, 10) : [],
    faq: Array.isArray(raw.faq) ? raw.faq.slice(0, 6) : [],
    reading_time_minutes: Math.max(3, Math.ceil(content.length / 500)),
  };
}
