import "server-only";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getUser } from "@/lib/supabase/auth";
import type { GeneratedEventContent } from "@/components/event-form/types";

const MODEL = "gpt-4.1";

const SYSTEM_PROMPT = [
  "당신은 반영구 시술 이벤트 마케팅 전문 카피라이터입니다.",
  "",
  "## 역할",
  "반영구 타투 아티스트가 입력한 최소한의 시술 정보를 바탕으로,",
  "고객이 예약하고 싶어지는 매력적인 이벤트 상세 페이지 콘텐츠를 생성합니다.",
  "",
  "## 절대 준수 원칙",
  "1. **한국어 전용**: 모든 출력은 한국어로만 작성합니다.",
  "2. **거짓 의료 정보 금지**: 의학적 효과를 과장하거나 거짓 주장을 하지 않습니다.",
  "3. **톤**: 감성적이면서 신뢰감 있는 톤. 친근하되 전문적인 느낌.",
  "4. **고객 중심**: 시술의 혜택을 고객 관점에서 설명합니다.",
  "5. **구체성**: 추상적 표현 대신 구체적 설명과 수치를 사용합니다.",
  "6. **valid JSON만 출력**: 다른 텍스트 절대 금지.",
  "",
  "## 출력 구조",
  "- headline: 고객의 마음을 사로잡는 메인 카피 (30자 이내)",
  "- subheadline: headline을 보완하는 서브 카피 (50자 이내)",
  "- sections: 4~6개 콘텐츠 섹션 (각 heading + body)",
  "  - 추천 섹션: 시술 소개, 이런 분께 추천, 시술 과정, 주의사항/관리법, 아티스트 소개",
  "  - body는 2~4문단, 각 문단 2~3문장. 자연스럽고 읽기 쉽게.",
  "- targetAudienceExpanded: 추천 대상을 감성적으로 확장 설명",
  "- faq: 고객이 자주 묻는 질문 3~5개",
  "- callToAction: CTA 문구 (예: '지금 예약하고 특별 혜택 받기')",
  "- seoDescription: 120자 이내 메타 디스크립션",
].join("\n");

interface GenerateEventInput {
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

function buildUserPrompt(input: GenerateEventInput): string {
  return [
    "# 이벤트 정보",
    "",
    `- 시술 카테고리: ${input.category}`,
    `- 시술명: ${input.procedureName}`,
    `- 이벤트 제목: ${input.title}`,
    `- 일반가: ${Number(input.priceOrigin).toLocaleString()}원`,
    `- 이벤트가: ${Number(input.price).toLocaleString()}원`,
    `- 할인율: ${input.discountRate}%`,
    `- 리터치: ${input.retouchType}${input.retouchDescription ? ` (${input.retouchDescription})` : ""}`,
    `- 이벤트 기간: ${input.eventPeriodText || "상시"}`,
    `- 한 줄 소개: ${input.procedureSummary}`,
    `- 추천 대상: ${input.targetAudience.join(", ")}`,
    "",
    "# 샵 정보",
    `- 샵명: ${input.shopName}`,
    `- 지역: ${input.shopRegion ?? ""}`,
    `- 영업시간: ${input.shopBusinessHours || "미입력"}`,
    `- 주차: ${input.shopParking || "미입력"}`,
    `- 예약: ${input.shopBookingMethod || "미입력"}`,
    "",
    "# 선택 입력 (있는 경우만)",
    input.procedureDuration ? `- 시술 시간: ${input.procedureDuration}` : "",
    input.maintenancePeriod ? `- 유지 기간: ${input.maintenancePeriod}` : "",
    input.procedureAdvantages?.length ? `- 시술 장점: ${input.procedureAdvantages.filter(Boolean).join(", ")}` : "",
    input.precautions ? `- 주의사항: ${input.precautions}` : "",
    input.artistIntroduction ? `- 아티스트 소개: ${input.artistIntroduction}` : "",
    "",
    "위 정보를 바탕으로 이벤트 상세 페이지 콘텐츠를 JSON으로 생성해주세요.",
    "headline, subheadline, sections(4~6개), targetAudienceExpanded, faq(3~5개), callToAction, seoDescription을 포함해주세요.",
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

    const input = await request.json() as GenerateEventInput;
    if (!input.procedureName || !input.title) {
      return NextResponse.json({ error: "필수 항목이 누락되었습니다" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      temperature: 0.85,
      max_tokens: 4096,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(input) },
      ],
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) {
      return NextResponse.json({ error: "AI 응답이 비어있습니다" }, { status: 500 });
    }

    const content = JSON.parse(text) as GeneratedEventContent;
    return NextResponse.json({ content });
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI 생성 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
