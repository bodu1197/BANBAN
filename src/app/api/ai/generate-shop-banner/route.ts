import "server-only";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getUser } from "@/lib/supabase/auth";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { processBase64ToWebp, sanitizePromptValue, ImageDecodeError } from "@/lib/event/image-service";

export const maxDuration = 180;

const IMAGE_MODEL = "gpt-image-2";
const GEN_SIZE = "1536x1024" as const; // 가로형(3:2) 생성 → Sharp 로 1020x340(3:1) cover crop
const BANNER_W = 1020;
const BANNER_H = 340;

function colorThemeFor(category: string): string {
  if (category.includes("눈썹")) return "soft pink and ivory";
  if (category.includes("입술")) return "coral and warm beige";
  if (category.includes("두피") || category.includes("헤어")) return "sage green and cream";
  if (category.includes("속눈썹")) return "champagne gold and nude";
  if (category.includes("네일")) return "lavender and white";
  return "soft pink and ivory";
}

interface BannerInput {
  shopName: string;
  category: string;
  atmosphere: string;
}

function buildBannerPrompt(input: BannerInput): string {
  const shopName = sanitizePromptValue(input.shopName, 60);
  const category = sanitizePromptValue(input.category, 60);
  const atmosphere = sanitizePromptValue(input.atmosphere, 40);
  const colorTheme = colorThemeFor(category);
  return [
    "한국 반영구 메이크업/뷰티 샵의 가로형 대표 배너 이미지를 만들어주세요. (가로로 길게 펼쳐지는 와이드 배너, 약 3:1 비율)",
    shopName ? `샵 이름: "${shopName}"` : "",
    category ? `전문 시술: ${category}` : "",
    atmosphere ? `분위기: ${atmosphere}` : "",
    `컬러 테마: ${colorTheme}`,
    "스타일: 사실적이고 고급스러운 K-뷰티 마케팅 배너. 만화·일러스트·카툰 절대 금지. 사실적 사진 기반.",
    "중앙에 우아한 뷰티/시술 결과 이미지, 부드러운 그라데이션 배경. 좌우로 여백 있게 가로 구도.",
    "텍스트는 최소화. 워터마크·로고 없음.",
  ].filter(Boolean).join("\n");
}

async function generateBannerB64(client: OpenAI, prompt: string): Promise<string | undefined> {
  const result = await client.images.generate({
    model: IMAGE_MODEL,
    prompt,
    n: 1,
    size: GEN_SIZE,
    quality: "medium",
  });
  return result.data?.[0]?.b64_json;
}

type BannerResult = { ok: true; webp: Buffer } | { ok: false; error: string; status: number };

async function buildBannerWebp(client: OpenAI, prompt: string): Promise<BannerResult> {
  let b64: string | undefined;
  try {
    b64 = await generateBannerB64(client, prompt);
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error("[generate-shop-banner] OpenAI:", err instanceof Error ? err.message : err);
    return { ok: false, error: "배너 생성에 실패했습니다. 잠시 후 다시 시도해주세요.", status: 502 };
  }
  if (!b64) return { ok: false, error: "이미지 데이터가 비어있습니다", status: 500 };

  try {
    const webp = await processBase64ToWebp(b64, { width: BANNER_W, height: BANNER_H });
    return { ok: true, webp };
  } catch (err: unknown) {
    return { ok: false, error: "이미지 변환 실패", status: err instanceof ImageDecodeError ? 400 : 500 };
  }
}

async function authorizeRequest(): Promise<{ userId: string } | NextResponse> {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  // gpt-image-2 비용 어뷰징 방지 — 분당 10회/유저.
  if (!rateLimit({ key: `shop-banner:${user.id}`, limit: 10, windowMs: 60_000 }).success) {
    return rateLimitResponse();
  }
  return { userId: user.id };
}

function parseBannerInput(body: Partial<BannerInput>): BannerInput {
  return {
    shopName: typeof body.shopName === "string" ? body.shopName : "",
    category: typeof body.category === "string" ? body.category : "",
    atmosphere: typeof body.atmosphere === "string" ? body.atmosphere : "",
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });

    const auth = await authorizeRequest();
    if (auth instanceof NextResponse) return auth;

    const input = parseBannerInput(await request.json() as Partial<BannerInput>);

    const client = new OpenAI({ apiKey, timeout: 150_000 });
    const result = await buildBannerWebp(client, buildBannerPrompt(input));
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

    // 등록 시점엔 artistId 가 없을 수 있어 storage 업로드 대신 base64 반환 →
    // 클라이언트가 File 로 만들어 기존 배너 업로드 경로(submit 시 PUT)로 일원화.
    return NextResponse.json({ image: `data:image/webp;base64,${result.webp.toString("base64")}` });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "배너 생성 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
