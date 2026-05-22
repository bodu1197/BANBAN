import "server-only";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getUser } from "@/lib/supabase/auth";
import type { GeneratedDetailCopy } from "@/components/event-form/types";

export const maxDuration = 60;

const MODEL = "gpt-4.1";

const SYSTEM_PROMPT = [
  "당신은 반영구 시술 이벤트 마케팅 전문 카피라이터입니다.",
  "",
  "## 역할",
  "반영구 타투 아티스트가 입력한 시술 정보를 바탕으로,",
  "AI 이미지 생성에 사용할 짧고 임팩트 있는 한국어 텍스트를 7개 섹션으로 생성합니다.",
  "이 텍스트는 이미지 안에 렌더링될 것이므로, 짧고 시각적으로 강렬해야 합니다.",
  "",
  "## 절대 준수 원칙",
  "1. **한국어 전용**: 모든 출력은 한국어로만.",
  "2. **거짓 의료 정보 금지**: 의학적 효과를 과장하지 않습니다.",
  "3. **짧은 텍스트**: 이미지 안에 들어갈 텍스트이므로 헤드라인/키워드 위주.",
  "4. **valid JSON만 출력**: 다른 텍스트 절대 금지.",
  "",
  "## 출력 구조",
  "```",
  "{",
  '  "sections": {',
  '    "detail_hero": { "headline": "30자 이내 메인 카피", "subtext": "20자 이내 서브 카피", "colorTheme": "soft pink and ivory" 등 색상 테마 },',
  '    "detail_intro": { "heading": "시술 소개 제목", "benefits": ["장점1", "장점2", "장점3"], "bodyText": "2문장 요약" },',
  '    "detail_before_after": { "heading": "전후 비교 제목", "caption": "신뢰감 있는 한 줄 캡션" },',
  '    "detail_audience": { "heading": "추천 대상 제목", "items": [{"emoji": "✨", "text": "대상1"}, ...] 4~5개 },',
  '    "detail_process": { "heading": "시술 과정 제목", "steps": ["단계1", "단계2", ...], "precautions": ["주의1", "주의2", ...] },',
  '    "detail_shop": { "heading": "샵 안내 제목", "details": ["위치: ...", "영업시간: ...", ...] },',
  '    "detail_cta": { "heading": "CTA 제목", "urgencyText": "긴급감 한 줄", "ctaButton": "버튼 텍스트" }',
  "  },",
  '  "seoDescription": "120자 이내 메타 디스크립션",',
  '  "altTexts": { "detail_hero": "이미지 설명", ... 7개 }',
  "}",
  "```",
  "",
  "## colorTheme 선택 기준",
  "- 눈썹: soft pink and ivory",
  "- 입술: coral and warm beige",
  "- 두피: sage green and cream",
  "- 네일: lavender and white",
  "- 속눈썹: champagne gold and nude",
  "- 헤어라인: dusty rose and pearl",
  "- 기타: soft blue and ivory",
].join("\n");

interface GenerateCopyInput {
  category: string;
  procedureName: string;
  title: string;
  priceOrigin: string | number;
  price: string | number;
  discountRate: number;
  retouchType: string;
  retouchDescription?: string;
  eventPeriodText?: string;
  procedureSummary: string;
  targetAudience: string[];
  shopName: string;
  shopRegion?: string;
  shopBusinessHours?: string;
  shopParking?: string;
  shopBookingMethod?: string;
  procedureDuration?: string;
  maintenancePeriod?: string;
  procedureAdvantages?: string[];
  precautions?: string;
  artistIntroduction?: string;
}

function buildUserPrompt(input: GenerateCopyInput): string {
  return [
    "# 이벤트 정보",
    `- 카테고리: ${input.category}`,
    `- 시술명: ${input.procedureName}`,
    `- 이벤트 제목: ${input.title}`,
    `- 일반가: ${Number(input.priceOrigin).toLocaleString()}원`,
    `- 이벤트가: ${Number(input.price).toLocaleString()}원`,
    `- 할인율: ${input.discountRate}%`,
    `- 리터치: ${input.retouchType}${input.retouchDescription ? ` (${input.retouchDescription})` : ""}`,
    `- 기간: ${input.eventPeriodText || "상시"}`,
    `- 소개: ${input.procedureSummary}`,
    `- 추천 대상: ${input.targetAudience.join(", ")}`,
    "",
    "# 샵 정보",
    `- 샵명: ${input.shopName}`,
    input.shopRegion ? `- 지역: ${input.shopRegion}` : "",
    input.shopBusinessHours ? `- 영업시간: ${input.shopBusinessHours}` : "",
    input.shopParking ? `- 주차: ${input.shopParking}` : "",
    input.shopBookingMethod ? `- 예약: ${input.shopBookingMethod}` : "",
    "",
    input.procedureDuration ? `- 시술 시간: ${input.procedureDuration}` : "",
    input.maintenancePeriod ? `- 유지 기간: ${input.maintenancePeriod}` : "",
    input.procedureAdvantages?.length ? `- 장점: ${input.procedureAdvantages.filter(Boolean).join(", ")}` : "",
    input.precautions ? `- 주의사항: ${input.precautions}` : "",
    input.artistIntroduction ? `- 아티스트 소개: ${input.artistIntroduction}` : "",
    "",
    "위 정보로 7개 섹션의 이미지용 텍스트 카피를 JSON으로 생성해주세요.",
    "모든 텍스트는 이미지 안에 렌더링될 것이므로 짧고 임팩트 있게.",
  ].filter(Boolean).join("\n");
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
    }

    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const input = (await request.json()) as GenerateCopyInput;
    if (!input.procedureName || !input.title) {
      return NextResponse.json({ error: "필수 항목이 누락되었습니다" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 3000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(input) },
      ],
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) {
      return NextResponse.json({ error: "AI 응답이 비어있습니다" }, { status: 500 });
    }

    const content = JSON.parse(text) as GeneratedDetailCopy;
    return NextResponse.json({ content });
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI 카피 생성 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
