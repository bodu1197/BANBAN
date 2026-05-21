import "server-only";
import OpenAI from "openai";
import type { EncyclopediaTopic } from "./topics";
import { pickRelatedPortfolioImages, uploadThumbnailToStorage } from "./queries";
import { estimateReadingTime } from "@/lib/board/utils";

const MODEL = "gpt-4o";
const IMAGE_MODEL = "gpt-image-2";
const SITE_NAME = "반언니";
const AI_TEMPERATURE = 0.85;
const AI_MAX_TOKENS = 8192;

export interface GeneratedArticle {
  title: string;
  excerpt: string;
  content: string;
  meta_title: string;
  meta_description: string;
  keywords: string[];
  tags: string[];
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
  tags?: string[];
  faq?: { question: string; answer: string }[];
  sections?: { heading: string; body: string }[];
  introduction?: string;
  conclusion?: string;
}

const WRITING_ANGLES = [
  "피부과학 논문·임상 데이터 기반 심층 분석",
  "시술 전후 타임라인과 회복 과정 밀착 가이드",
  "흔한 오해 vs 과학적 팩트 — 미신 타파 접근",
  "해외(미국·일본·유럽) 기술 동향과 한국 시장 비교",
  "비용 구조 분석 — 가격대별 차이와 합리적 선택 기준",
  "시술 경력 10년 이상 전문가 관점의 테크닉 해설",
  "피부 타입·연령·생활 습관별 맞춤 추천 가이드",
  "시술 실패 사례 분석과 예방·대처법",
] as const;

function pickAngle(): string {
  return WRITING_ANGLES[Math.floor(Math.random() * WRITING_ANGLES.length)];
}

const SYSTEM_PROMPT = [
  "당신은 대한피부과학회·대한미용학회 자문급 전문성을 가진 반영구 메이크업 에디터입니다.",
  "피부과학(dermatology), 색소학(pigmentology), 미용의학(aesthetic medicine) 분야의 학술 논문과 임상 데이터를 근거로 글을 작성합니다.",
  "",
  "## 절대 준수 원칙",
  "1. **근거 기반 서술**: 모든 핵심 주장에 구체적 수치·연구 결과·의학적 메커니즘을 포함합니다.",
  '   - 좋은 예: "표피(epidermis) 0.1mm 깊이에 색소를 주입하며, Journal of Cosmetic Dermatology(2023) 연구에 따르면 12개월 후 색소 잔존율은 평균 40~60%입니다."',
  '   - 나쁜 예: "자연스러운 결과를 얻을 수 있습니다." (추상적, 근거 없음)',
  "2. **고유성**: 동일 사이트의 다른 글과 문장 구조·도입부·결론이 겹치면 안 됩니다. 매번 새로운 앵글과 서사 구조를 사용합니다.",
  "3. **E-E-A-T 준수**: Google의 Experience, Expertise, Authoritativeness, Trustworthiness 기준을 충족합니다.",
  "4. **신뢰성 고지**: 모든 글 말미에 '본 콘텐츠는 의료 조언이 아니며, 개인차가 크므로 반드시 전문의 상담을 권장합니다'를 명확히 표기합니다.",
  "5. **한국어 전용**: 대한민국 독자(2026년) 기준. 한국 의료법·공정거래법 맥락을 반영합니다.",
  "6. **반드시 valid JSON만 출력**: 다른 텍스트 절대 금지.",
  "",
  "## 할루시네이션 금지 (Critical)",
  "- **가상의 연도·날짜·사건을 절대 만들어내지 마세요.** '6587년', '기원전 3000년 눈썹 문신' 같은 허구 서술 금지.",
  "- **실제 학술지 인용 시**: 저널명·연도만 언급하고, 존재하지 않는 논문 DOI·저자명을 날조하지 마세요.",
  "- **수치는 업계 공통 범위만 사용**: 확신할 수 없는 수치에는 '약', '일반적으로', '~' 등 한정어를 붙이세요.",
  "- **확인 불가한 주장은 생략**: 사실로 검증할 수 없는 역사적 사실·통계·연구를 만들어내느니 아예 쓰지 마세요.",
].join("\n");

function buildPrompt(topic: EncyclopediaTopic): string {
  const angle = pickAngle();
  const seed = Math.floor(Math.random() * 10000);
  return [
    `# 작성 임무`,
    `"${SITE_NAME}" 뷰티 백과사전에 게시할 한국어 전문 정보 글을 작성하세요.`,
    ``,
    `## ⚠️ 분량 요구사항 (위반 시 전체 거부)`,
    `- **introduction**: 최소 400자 (3문단 이상)`,
    `- **sections**: 정확히 6개, 각 body 최소 400자 (3문단 이상)`,
    `- **conclusion**: 최소 300자 (2문단 이상)`,
    `- **전체 합산**: 최소 4,000자. 짧게 쓰면 자동 거부됨.`,
    `- 각 문단은 구체적 수치·메커니즘·비교·사례를 포함하여 충실하게 작성할 것.`,
    `- "~합니다." 한 문장으로 끝내지 말고, 왜 그런지·어떤 경우에·구체적으로 어떻게 를 반드시 덧붙일 것.`,
    ``,
    `## 주제 정보`,
    `- 카테고리: ${topic.category}`,
    `- 핵심 키워드: ${topic.keyword}`,
    `- 주제명: ${topic.title}`,
    `- **이번 글의 접근 앵글**: ${angle}`,
    `- 다양성 시드: ${seed} (이 숫자를 참고해 도입부 서사·비유·사례를 매번 다르게 구성)`,
    ``,
    `## 콘텐츠 품질 기준 (Google Helpful Content 가이드라인 준수)`,
    ``,
    `### 필수 포함 요소`,
    `1. **구체적 수치 3개 이상**: 유지 기간(개월), 시술 시간(분), 통증 수준(VAS 점수), 색소 잔존율(%), 시술 가격대(만원), 회복 기간(일) 등`,
    `2. **의학적 메커니즘 설명**: 피부 구조(표피·진피), 색소 침착 원리, 대사·면역 반응 등 "왜 그런지"를 과학적으로 설명`,
    `3. **비교 분석**: 유사 시술·기법 간 객관적 비교표 또는 장단점 대조 (표 형태는 마크다운 테이블 사용 가능)`,
    `4. **실질적 조언**: "시술 전 48시간 카페인 섭취를 줄이면 출혈 감소에 도움" 같은 구체적·행동 가능한 팁`,
    `5. **주의사항·부작용**: 켈로이드 체질, 임산부, 자가면역질환, 혈액 희석제 복용자 등 주의 대상 명시`,
    `6. **법적 고지**: 의료 행위와의 경계, 자격 기준(보건복지부 고시), 시술 동의서 필요성 언급`,
    ``,
    `### 글쓰기 규칙`,
    `- **독창적 도입**: "최근 ~가 주목받고 있습니다" 같은 진부한 시작 금지. **실제 검증 가능한** 통계·사례·질문으로 시작. 허구의 연도·사건·인물 날조 금지.`,
    `- **다양한 문체**: 설명 → 분석 → 비교 → 조언 순서로 리듬을 변화. 불릿·번호 목록·마크다운 테이블 혼합 사용`,
    `- **키워드 배치**: 핵심 키워드를 문맥에 맞게 자연스럽게 배치. 억지스러운 반복은 SEO 패널티 유발`,
    `- **짧은 문단**: 2~4문장. 모바일 가독성 우선`,
    `- **내부 연결 힌트**: 관련 주제(예: "애프터케어 가이드", "리터치 시기") 언급 시 자연스럽게 키워드 노출`,
    `- **광고성 문구·과장·특정 샵 추천 절대 금지**`,
    `- **의료 조언이 아님을 마무리에 부드럽게 명시**`,
    ``,
    `## 출력 형식 (valid JSON만, 다른 텍스트 절대 금지)`,
    `{`,
    `  "title": "60자 이내, 검색 의도를 정확히 반영한 제목 (질문형·숫자형·비교형 중 택1)",`,
    `  "meta_title": "55자 이내 SEO 제목 (사이트명 포함 금지, 핵심 키워드 선두 배치)",`,
    `  "meta_description": "110~140자 메타 설명. 핵심 키워드 포함 + 클릭 유도 (모바일 잘림 방지)",`,
    `  "excerpt": "80~120자 발췌문. 글의 핵심 가치를 한 문장으로",`,
    `  "introduction": "도입부 3문단 이상, 최소 400자. 독자의 검색 의도에 직접 답하며 시작. 구체적 통계나 사례로 신뢰 확보",`,
    `  "sections": [`,
    `    { "heading": "소제목 (H2, 키워드 포함)", "body": "본문 최소 400자, 3문단 이상 (\\n\\n 구분. 마크다운 테이블·불릿 사용 가능. 구체적 수치·사례 필수)" },`,
    `    { "heading": "...", "body": "..." },`,
    `    { "heading": "...", "body": "..." },`,
    `    { "heading": "...", "body": "..." },`,
    `    { "heading": "...", "body": "..." },`,
    `    { "heading": "...", "body": "..." }`,
    `  ],`,
    `  "conclusion": "마무리 2~3문단, 최소 300자. 핵심 요약 + 다음 단계 제안 + 의료조언 아님 고지",`,
    `  "faq": [`,
    `    { "question": "검색량 있는 구체적 질문 (Google People Also Ask 스타일)", "answer": "2~4문장, 수치 포함 답변" },`,
    `    { "question": "...", "answer": "..." },`,
    `    { "question": "...", "answer": "..." },`,
    `    { "question": "...", "answer": "..." },`,
    `    { "question": "...", "answer": "..." }`,
    `  ],`,
    `  "keywords": ["핵심 검색 키워드 8~12개 — 롱테일 키워드 포함"],`,
    `  "tags": ["해시태그 5~8개 — 카테고리+시술명+관련어"]`,
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

  if (images[0]) {
    lines.push(`![${images[0].alt}](${images[0].url})`, "");
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

export function buildSlug(topic: EncyclopediaTopic, title: string): string {
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

const CATEGORY_IMAGE_HINTS: Record<string, string> = {
  눈썹: "eyebrow area showing natural, well-shaped semi-permanent eyebrow tattoo with hair-stroke detail",
  아이라인: "eye area with subtle semi-permanent eyeliner enhancing the lash line",
  입술: "lips with semi-permanent lip blush in natural MLBB (my lips but better) tone",
  헤어라인: "hairline area showing natural-looking scalp micropigmentation or hairline tattoo",
  속눈썹: "eye area with enhanced lash line and semi-permanent lash definition",
  관리: "clean beauty treatment room setting with professional tools and skincare products",
  안전: "sterile professional beauty treatment environment with safety equipment and gloves",
  트렌드: "modern Korean beauty salon interior with minimalist aesthetic",
  기타: "professional beauty treatment close-up with soft lighting",
};

function buildImagePrompt(topic: EncyclopediaTopic, title: string): string {
  const hint = CATEGORY_IMAGE_HINTS[topic.category] ?? CATEGORY_IMAGE_HINTS["기타"];
  return [
    `Professional Korean beauty editorial photograph for a semi-permanent makeup encyclopedia.`,
    `Topic: "${title}".`,
    `Subject: ${hint}.`,
    `Style: High-end K-beauty magazine photo. Soft diffused studio lighting, shallow depth of field, clean composition.`,
    `Korean model with dewy, luminous skin. Minimal retouching aesthetic.`,
    `No text, no logos, no watermarks. Square 1:1 ratio. Warm neutral color palette with soft pink and beige tones.`,
  ].join(" ");
}

async function generateThumbnail(
  client: OpenAI,
  topic: EncyclopediaTopic,
  title: string,
): Promise<Buffer> {
  const prompt = buildImagePrompt(topic, title);
  const result = await client.images.generate({
    model: IMAGE_MODEL,
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "medium",
  });
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("Image generation returned empty");
  return Buffer.from(b64, "base64");
}

async function callOpenAiText(
  client: OpenAI,
  topic: EncyclopediaTopic,
): Promise<RawAiOutput> {
  const completion = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    temperature: AI_TEMPERATURE,
    max_tokens: AI_MAX_TOKENS,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildPrompt(topic) },
    ],
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error("OpenAI returned empty response");

  try {
    return JSON.parse(text) as RawAiOutput;
  } catch (e) {
    throw new Error(`OpenAI returned invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function stripSiteSuffix(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/\s*[-|–—]\s*반언니\s*$/u, "").trim();
}

function asArray<T>(value: unknown, max: number): T[] {
  return Array.isArray(value) ? (value.slice(0, max) as T[]) : [];
}

function normalizeAiOutput(
  parsed: RawAiOutput,
  topic: EncyclopediaTopic,
  content: string,
  images: { url: string; alt: string }[],
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
    reading_time_minutes: estimateReadingTime(content),
    images,
  };
}

export async function generateEncyclopediaArticle(
  topic: EncyclopediaTopic,
): Promise<GeneratedArticle> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  const client = new OpenAI({ apiKey });

  const gender = /남자|남성/.test(topic.keyword) ? "남성" as const : "여성" as const;
  const [parsed, portfolioImages] = await Promise.all([
    callOpenAiText(client, topic),
    pickRelatedPortfolioImages(topic.keyword, 3, gender),
  ]);

  const title = parsed.title?.trim() ?? topic.title;
  const thumbnailBuffer = await generateThumbnail(client, topic, title);
  const thumbnailUrl = await uploadThumbnailToStorage(thumbnailBuffer, topic.id, topic.slug, title);

  const coverImage = { url: thumbnailUrl, alt: `${topic.keyword} — ${title}` };
  const images = [coverImage, ...portfolioImages];
  const content = buildContentMarkdown(parsed, images);
  return normalizeAiOutput(parsed, topic, content, images);
}
