import "server-only";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getUser } from "@/lib/supabase/auth";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const maxDuration = 60;

// 시술 사진 → 한국어 작품 설명. vision 모델 필요.
const MODEL = "gpt-4o";
const MAX_B64_LEN = 8_000_000; // base64 길이 상한(≈6MB 이미지) — 비용·페이로드 가드.

const SYSTEM_PROMPT = [
  "당신은 반영구 메이크업·타투 시술 사진을 보고 작품 설명을 작성하는 한국어 전문 에디터입니다.",
  "사진에 보이는 시술의 부위·스타일·기법·색감·분위기를 구체적으로 묘사합니다.",
  "## 절대 준수",
  "1. 한국어 전용.",
  "2. 설명은 200자 이상 400자 이하.",
  "3. 과장·허위·가격·연락처 언급 금지. 사진에서 실제로 보이는 것만 묘사.",
  '4. valid JSON 만 출력: { "description": "..." }',
].join("\n");

async function describeImage(apiKey: string, imageDataUrl: string): Promise<string | null> {
  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    temperature: 0.6,
    max_tokens: 700,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "이 시술 사진을 보고 작품 설명을 200자 이상 한국어로 작성해 JSON 으로 반환하세요." },
          { type: "image_url", image_url: { url: imageDataUrl, detail: "low" } },
        ],
      },
    ],
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as { description?: unknown };
    return typeof parsed.description === "string" ? parsed.description.trim() : null;
  } catch {
    return null; // 잘못된 AI JSON — 502 처리(원문 보존, 500 방지)
  }
}

// 이미지 base64 검증 → data URL. 실패 시 에러 응답.
function parseImageRequest(body: { imageBase64?: string; mimeType?: string }): { dataUrl: string } | { error: NextResponse } {
  const b64 = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
  if (!b64) return { error: NextResponse.json({ error: "이미지가 필요합니다" }, { status: 400 }) };
  if (b64.length > MAX_B64_LEN) return { error: NextResponse.json({ error: "이미지가 너무 큽니다" }, { status: 400 }) };
  const mime = body.mimeType === "image/png" || body.mimeType === "image/jpeg" ? body.mimeType : "image/webp";
  return { dataUrl: `data:${mime};base64,${b64}` };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });

    const user = await getUser();
    if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

    // vision 비용 어뷰징 방지 — 분당 10회/유저.
    if (!rateLimit({ key: `portfolio-ai:${user.id}`, limit: 10, windowMs: 60_000 }).success) {
      return rateLimitResponse();
    }

    const parsed = parseImageRequest(await request.json() as { imageBase64?: string; mimeType?: string });
    if ("error" in parsed) return parsed.error;

    const description = await describeImage(apiKey, parsed.dataUrl);
    // 50자 가드는 AI 생성 품질 게이트(프롬프트 200~400자 미달=생성 실패 신호)일 뿐,
    // 사용자 수동 입력에는 글자수 최소 제한이 없음 — 별개 기준이라 동기화 대상 아님.
    if (!description || description.length < 50) {
      return NextResponse.json({ error: "설명 생성에 실패했습니다. 다시 시도해주세요." }, { status: 502 });
    }
    return NextResponse.json({ description });
  } catch (e: unknown) {
    // 내부 에러 상세는 클라에 노출 안 함 — 서버 로그만.
    // eslint-disable-next-line no-console
    console.error("[analyze-portfolio-image]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "AI 설명 생성에 실패했습니다." }, { status: 500 });
  }
}
