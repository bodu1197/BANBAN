import OpenAI from "openai";
import type { EncyclopediaTopic } from "./topics";
import { pickRelatedPortfolioImages } from "./queries";

const MODEL = "gpt-4o-mini"; // cheap, capable; ~365 generations/year cost is trivial
const SITE_NAME = "반언니";

export interface GeneratedArticle {
  title: string;
  excerpt: string;
  content: string; // Markdown — uses ## / ### headings, ![alt](url) image syntax
  meta_title: string;
  meta_description: string;
  keywords: string[];
  tags: string[];
  faq: { question: string; answer: string }[];
  reading_time_minutes: number;
}

interface RawAiOutput {
  title?: string;
  excerpt?: string;
  meta_title?: string;
  meta_description?: string;
  keywords?: string[];
  tags?: string[];
  faq?: { question: string; answer: string }[];
  sections?: { heading: string; body: string }[];
  introduction?: string;
  conclusion?: string;
}

function buildPrompt(topic: EncyclopediaTopic): string {
  return [
    `당신은 한국 반영구 메이크업 분야의 전문 에디터이자 SEO 카피라이터입니다.`,
    `웹사이트 "${SITE_NAME}"의 뷰티 백과사전 코너에 게시할 1,500~2,000자 분량의 한국어 깊이 있는 정보성 글을 작성하세요.`,
    ``,
    `# 주제`,
    `- 카테고리: ${topic.category}`,
    `- 제목 키워드: ${topic.keyword}`,
    ``,
    `# 작성 규칙`,
    `1. 전문성: 의학적/문화적/역사적 사실은 정확하게. 추측은 "~라고 알려져 있습니다" 등으로 표시.`,
    `2. SEO: 제목·도입·소제목에 핵심 키워드 자연스럽게 배치(과도한 반복 금지).`,
    `3. 가독성: 짧은 문단(2~4문장), 명확한 소제목, 불릿 활용 가능.`,
    `4. 신뢰성: 위험·부작용·법적 사항이 있다면 반드시 안내. 의료조언이 아님을 부드럽게 명시.`,
    `5. 한국 독자(2026년) 기준. 한국 법·문화 맥락을 반영.`,
    `6. 광고성 문구·과장·추천샵 언급 금지.`,
    ``,
    `# 출력 형식 (반드시 valid JSON, 다른 텍스트 절대 출력 금지)`,
    `{`,
    `  "title": "60자 이내의 매력적 제목",`,
    `  "meta_title": "55자 이내 SEO 제목 (사이트명 포함 금지)",`,
    `  "meta_description": "150자 이내 메타 설명, 핵심 키워드 포함",`,
    `  "excerpt": "120자 이내의 발췌문",`,
    `  "introduction": "도입부 2~3문단",`,
    `  "sections": [`,
    `    { "heading": "소제목1", "body": "본문 단락(여러 문단 가능, \\n\\n으로 구분)" },`,
    `    { "heading": "소제목2", "body": "..." },`,
    `    { "heading": "소제목3", "body": "..." },`,
    `    { "heading": "소제목4", "body": "..." }`,
    `  ],`,
    `  "conclusion": "마무리 1~2문단",`,
    `  "faq": [`,
    `    { "question": "자주 묻는 질문 1", "answer": "답변" },`,
    `    { "question": "자주 묻는 질문 2", "answer": "답변" },`,
    `    { "question": "자주 묻는 질문 3", "answer": "답변" }`,
    `  ],`,
    `  "keywords": ["핵심 검색 키워드 5~8개"],`,
    `  "tags": ["해시태그 스타일 5~8개"]`,
    `}`,
  ].join("\n");
}

function buildContentMarkdown(
  raw: RawAiOutput,
  images: { url: string; alt: string }[],
): string {
  const sections = raw.sections ?? [];
  const lines: string[] = [];

  if (raw.introduction) {
    lines.push(raw.introduction.trim(), "");
  }

  // Insert first image right after intro
  if (images[0]) {
    lines.push(`![${images[0].alt}](${images[0].url})`, "");
  }

  sections.forEach((s, i) => {
    lines.push(`## ${s.heading}`, "");
    lines.push(s.body.trim(), "");
    // Interleave remaining images between sections
    const img = images[i + 1];
    if (img) {
      lines.push(`![${img.alt}](${img.url})`, "");
    }
  });

  if (raw.conclusion) {
    lines.push("## 마치며", "");
    lines.push(raw.conclusion.trim(), "");
  }

  return lines.join("\n").trim();
}

function estimateReadingMinutes(content: string): number {
  // Korean average ~500 chars/minute
  const chars = content.length;
  return Math.max(3, Math.ceil(chars / 500));
}

export function buildSlug(topic: EncyclopediaTopic, title: string): string {
  // Encyclopedia slugs prefer the keyword (Korean) for SEO; fall back to id.
  const base = (title || topic.keyword)
    .normalize("NFC")
    .replace(/[^가-힣A-Za-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (!base) return `encyclopedia-${topic.id}`;
  return `${base}-${topic.id}`;
}

async function callOpenAi(topic: EncyclopediaTopic): Promise<RawAiOutput> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content:
          "You are a Korean semi-permanent makeup industry expert writer. Always respond with valid JSON only.",
      },
      { role: "user", content: buildPrompt(topic) },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI returned empty response");

  try {
    return JSON.parse(raw) as RawAiOutput;
  } catch (e) {
    throw new Error(`OpenAI returned invalid JSON: ${(e as Error).message}`);
  }
}

function stripSiteSuffix(value: string | undefined): string {
  if (!value) return "";
  // Remove trailing "- 반언니" / "| 반언니" (with optional spaces) so the
  // root layout's `%s | 반언니` template doesn't duplicate the site name.
  return value.replace(/\s*[-|–—]\s*반언니\s*$/u, "").trim();
}

function asArray<T>(value: unknown, max: number): T[] {
  return Array.isArray(value) ? (value.slice(0, max) as T[]) : [];
}

function normalizeAiOutput(
  parsed: RawAiOutput,
  topic: EncyclopediaTopic,
  content: string,
): GeneratedArticle {
  return {
    title: parsed.title?.trim() ?? topic.title,
    excerpt: parsed.excerpt?.trim() ?? "",
    content,
    meta_title: stripSiteSuffix(parsed.meta_title?.trim()) || topic.title,
    meta_description: parsed.meta_description?.trim() ?? "",
    keywords: asArray<string>(parsed.keywords, 10),
    tags: asArray<string>(parsed.tags, 10),
    faq: asArray<{ question: string; answer: string }>(parsed.faq, 6),
    reading_time_minutes: estimateReadingMinutes(content),
  };
}

export async function generateEncyclopediaArticle(
  topic: EncyclopediaTopic,
): Promise<GeneratedArticle> {
  const parsed = await callOpenAi(topic);
  const images = await pickRelatedPortfolioImages(topic.keyword, 4);
  const content = buildContentMarkdown(parsed, images);
  return normalizeAiOutput(parsed, topic, content);
}
