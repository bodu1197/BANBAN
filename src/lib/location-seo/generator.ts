import "server-only";
import OpenAI from "openai";
import type { LocationTarget } from "./targets";
import { pickRelatedPortfolioImages } from "@/lib/encyclopedia/queries";
import { estimateReadingTime } from "@/lib/board/utils";

const MODEL = "gpt-4o";
const SITE_NAME = "반언니";
const AI_TEMPERATURE = 0.8;
const AI_MAX_TOKENS = 8192;
const SECTION_COUNT = 6; // AI 가 생성하는 본문 섹션 수 — buildPrompt 의 "정확히 N개" 및 섹션 가이드(1..N)와 반드시 일치.
const IMAGE_COUNT = SECTION_COUNT + 1; // 커버 1(images[0]) + 섹션별 1장(images[1..SECTION_COUNT]) → buildContentMarkdown 의 images[i+1] 가 모든 섹션에 정합.
const SLUG_MAX_LENGTH = 80;
const MIN_SECTIONS = 4; // thin-content 거부 하한
const MIN_BODY_CHARS = 1500;

export interface GeneratedLocationPage {
  title: string;
  excerpt: string;
  content: string;
  meta_title: string;
  meta_description: string;
  keywords: string[];
  faq: { question: string; answer: string }[];
  reading_time_minutes: number;
  images: { url: string; alt: string }[];
}

interface RawAiOutput {
  title?: string;
  excerpt?: string;
  meta_title?: string;
  meta_description?: string;
  keywords?: string[];
  faq?: { question: string; answer: string }[];
  sections?: { heading: string; body: string }[];
  introduction?: string;
  conclusion?: string;
}

const SYSTEM_PROMPT = [
  "당신은 반영구 메이크업 시장에 정통한 한국어 지역 정보 에디터입니다.",
  "특정 지역(구 단위)에서 특정 시술을 찾는 검색자에게 실질적으로 도움이 되는 정보 글을 작성합니다.",
  "",
  "## 절대 준수 원칙",
  "1. **사실 기반**: 시술 자체의 정보(과정·유지기간·가격대·관리법)는 업계 공통 범위로 정확히. 지역 특성은 일반적으로 알려진 사실만(번화가·교통 등).",
  "2. **샵 정보 날조 절대 금지**: 존재 여부를 확인할 수 없는 특정 샵 이름·주소·전화번호·원장명·후기를 절대 만들어내지 마세요. 특정 업체 추천·광고성 문구 금지.",
  "3. **할루시네이션 금지**: 가상의 통계·연구·연도를 만들지 마세요. 본 프롬프트가 제공한 '반언니 등록 기준' 수치 외에 다른 지역/업계 통계 수치를 절대 생성하지 마세요. 확신 없는 수치엔 '약', '일반적으로', '~' 한정어를 붙이세요.",
  "4. **E-E-A-T**: Google Experience/Expertise/Authoritativeness/Trustworthiness 기준 충족.",
  "5. **한국어 전용**: 대한민국 독자(2026년) 기준. 의료법·공정거래법 맥락 반영.",
  "6. **의료 조언 아님 고지**: 글 말미에 '본 콘텐츠는 의료 조언이 아니며 개인차가 크므로 전문 상담을 권장합니다'를 명시.",
  "7. **반드시 valid JSON만 출력**: 다른 텍스트 절대 금지.",
].join("\n");

 
function buildPrompt(
  target: LocationTarget,
  stats: { artistCount: number; portfolioCount: number },
): string {
  return [
    `# 작성 임무`,
    `"${SITE_NAME}"(반영구 비교 플랫폼)에 게시할, "${target.region} ${target.style} 반영구" 검색 의도에 답하는 한국어 지역 정보 글을 작성하세요.`,
    ``,
    `## 실데이터 (반드시 반영, 날조 금지)`,
    `- 반언니 기준 ${target.region} 활동 샵: 약 ${stats.artistCount}곳`,
    `- ${target.region} 등록 작품(포트폴리오): 약 ${stats.portfolioCount}개`,
    `- 위 숫자를 글에 넣을 때는 반드시 "반언니에 등록된 기준 약 N곳/N개" 형태로 출처를 명시하세요(지역 전체 수치로 단정 금지). 이 두 수치 외 다른 통계는 생성 금지.`,
    ``,
    `## 분량 요구사항 (위반 시 거부)`,
    `- introduction: 최소 350자 (2~3문단)`,
    `- sections: 정확히 ${SECTION_COUNT}개, 각 body 최소 350자 (구체적 정보 포함)`,
    `- conclusion: 최소 250자`,
    `- 전체 최소 3,500자.`,
    ``,
    `## 주제`,
    `- 지역: ${target.region}`,
    `- 시술: ${target.style} 반영구`,
    ``,
    `## 섹션 구성 가이드 (heading 은 ${target.region}·${target.style} 키워드를 자연스럽게 포함)`,
    `1. ${target.region}에서 ${target.style} 반영구를 받을 때 고려할 점(지역 접근성·특성)`,
    `2. ${target.style} 반영구 시술 종류와 과정`,
    `3. ${target.style} 반영구 가격대와 비용 구성(만원 단위 일반 범위, 한정어 사용)`,
    `4. 시술 후 회복 과정과 관리법(구체적 일수·주의사항)`,
    `5. 좋은 샵 고르는 기준(위생·자격·포트폴리오 확인법 — 특정 업체 추천 금지)`,
    `6. 예약·상담 전 체크리스트`,
    ``,
    `## 글쓰기 규칙`,
    `- 구체적 수치(유지기간 개월, 시술시간 분, 가격대 만원, 회복 일수) 포함.`,
    `- 짧은 문단(2~4문장), 모바일 가독성. 불릿·마크다운 테이블 혼합 가능.`,
    `- 키워드("${target.region} ${target.style}", "${target.style} 반영구")를 자연스럽게 배치(억지 반복 금지).`,
    `- 특정 샵 추천·광고성·과장 금지. 의료 조언 아님을 마무리에 명시.`,
    ``,
    `## 출력 형식 (valid JSON만)`,
    `{`,
    `  "title": "55자 이내, '${target.region} ${target.style} 반영구'를 포함한 검색 친화적 제목",`,
    `  "meta_title": "55자 이내 SEO 제목(사이트명 제외, 지역+시술 키워드 선두)",`,
    `  "meta_description": "110~140자, 지역+시술 키워드 포함 + 클릭 유도",`,
    `  "excerpt": "80~120자 발췌문",`,
    `  "introduction": "도입부 2~3문단, 최소 350자. 검색 의도에 즉시 답하며 시작",`,
    `  "sections": [`,
    `    { "heading": "소제목(H2)", "body": "본문 최소 350자(\\n\\n 문단 구분)" }`,
    `    // 위 형식으로 정확히 ${SECTION_COUNT}개`,
    `  ],`,
    `  "conclusion": "마무리 2문단, 최소 250자. 반드시 다음 문장을 그대로 포함: '본 콘텐츠는 의료 조언이 아니며, 시술 결과는 개인차가 크므로 시술 전 전문가 상담을 권장합니다.'",`,
    `  "faq": [`,
    `    { "question": "${target.region} ${target.style} 관련 구체적 질문", "answer": "2~4문장 수치 포함 답변" }`,
    `    // 5개`,
    `  ],`,
    `  "keywords": ["지역+시술 롱테일 키워드 8~12개"]`,
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
  sections.forEach((s, i) => {
    lines.push(`## ${s.heading}`, "");
    lines.push(s.body.trim(), "");
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

export function buildLocationSlug(region: string, style: string): string {
  const base = `${region} ${style}`
    .normalize("NFC")
    .replace(/[^가-힣A-Za-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH);
  return base || "location";
}

function stripSiteSuffix(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/\s*[-|–—]\s*반언니\s*$/u, "").trim();
}

function asArray<T>(value: unknown, max: number): T[] {
  return Array.isArray(value) ? (value.slice(0, max) as T[]) : [];
}

async function callOpenAiText(
  client: OpenAI,
  target: LocationTarget,
  stats: { artistCount: number; portfolioCount: number },
): Promise<RawAiOutput> {
  const completion = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    temperature: AI_TEMPERATURE,
    max_tokens: AI_MAX_TOKENS,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildPrompt(target, stats) },
    ],
  });
  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error("OpenAI returned empty response");
  try {
    return JSON.parse(text) as RawAiOutput;
  } catch (e: unknown) {
    throw new Error(`OpenAI returned invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function normalizeOutput(
  parsed: RawAiOutput,
  target: LocationTarget,
  content: string,
  images: { url: string; alt: string }[],
): GeneratedLocationPage {
  const title = parsed.title?.trim() ?? `${target.region} ${target.style} 반영구`;
  return {
    title,
    excerpt: parsed.excerpt?.trim() ?? "",
    content,
    meta_title: stripSiteSuffix(parsed.meta_title?.trim()) || title,
    meta_description: parsed.meta_description?.trim() ?? "",
    keywords: asArray<string>(parsed.keywords, 12),
    faq: asArray<{ question: string; answer: string }>(parsed.faq, 6),
    reading_time_minutes: estimateReadingTime(content),
    images,
  };
}

/** thin-content 방어 — AI 출력이 비정상적으로 짧으면 발행하지 않고 실패시킴. */
function assertNotThin(parsed: RawAiOutput): void {
  const sections = parsed.sections ?? [];
  const bodyChars = [parsed.introduction, parsed.conclusion, ...sections.map((s) => s.body)]
    .filter(Boolean)
    .join("").length;
  if (sections.length < MIN_SECTIONS || bodyChars < MIN_BODY_CHARS) {
    throw new Error(`generated content too thin (sections=${sections.length}, chars=${bodyChars})`);
  }
}

export async function generateLocationPage(
  target: LocationTarget,
  stats: { artistCount: number; portfolioCount: number },
): Promise<GeneratedLocationPage> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  const client = new OpenAI({ apiKey });

  // 시술 실사진(반영구는 여성 카테고리 우세) — 지역 무관 스타일 작품으로 본문 예시 구성.
  const [parsed, images] = await Promise.all([
    callOpenAiText(client, target, stats),
    pickRelatedPortfolioImages(target.style, IMAGE_COUNT, "여성"),
  ]);

  assertNotThin(parsed);
  const content = buildContentMarkdown(parsed, images);
  return normalizeOutput(parsed, target, content, images);
}
