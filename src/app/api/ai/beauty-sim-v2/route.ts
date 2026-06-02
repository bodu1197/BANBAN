import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit";
import { resolveSimIdentity } from "@/lib/beauty-sim/identity";

export const maxDuration = 180;

const TARGET_SIZE = 1024;
const MAX_BASE64_LENGTH = 5_000_000;

type SimStep = "remove" | "simulate";
const VALID_STEPS = new Set<SimStep>(["remove", "simulate"]);

interface SimRequest {
  image: string;
  mask: string;
  step: SimStep;
  style?: string;
}

const CROP_OPTS = { fit: "cover" as const, position: "north" as const };

async function prepareImage(base64: string): Promise<Buffer> {
  return sharp(Buffer.from(base64, "base64"))
    .resize(TARGET_SIZE, TARGET_SIZE, CROP_OPTS)
    .png()
    .toBuffer();
}

async function convertMask(base64: string): Promise<Buffer> {
  const { data } = await sharp(Buffer.from(base64, "base64"))
    .resize(TARGET_SIZE, TARGET_SIZE, CROP_OPTS)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // RGBA: invert brightness → alpha so white mask areas become transparent (= edit zone for OpenAI)
  for (let i = 0; i < data.length; i += 4) {
    const brightness = data[i];
    data[i] = 0;
    data[i + 1] = 0;
    data[i + 2] = 0;
    data[i + 3] = 255 - brightness;
  }

  return sharp(data, { raw: { width: TARGET_SIZE, height: TARGET_SIZE, channels: 4 } })
    .png()
    .toBuffer();
}

// ─── Prompts ────────────────────────────────────────────────────────────────

const REMOVE_PROMPT =
  "Remove only the eyebrow hair within the masked area. Replace with smooth natural forehead skin matching surrounding skin tone and texture exactly. IMPORTANT: Preserve all head hair, hairline, eyelashes, and every other facial feature completely unchanged. Only the eyebrow region should be affected. Photorealistic result.";

const ANATOMY_RULES = [
  "CRITICAL ANATOMY RULES — violating any of these produces a deformed face:",
  "1. NEVER move the eyebrow vertically. The eyebrow must sit exactly on the original brow bone ridge position. Do NOT raise or lower it.",
  "2. NEVER change forehead height, eye-to-eyebrow distance, or any facial proportions. The forehead, eyes, nose, mouth, and chin must remain in their original pixel positions.",
  "3. Only modify the eyebrow SHAPE, THICKNESS, COLOR, and TEXTURE within the existing brow bone area.",
  "4. Maintain 5-8mm clear gap between the lower edge of the eyebrow and the upper eyelid crease (proportional to face).",
  "5. The eyebrow length should span from the inner corner of the eye to slightly past the outer corner — no wider, no shorter.",
  "6. Do NOT warp, stretch, compress, or distort any part of the face. Every non-eyebrow pixel must remain unchanged.",
  "7. The result must look like a real semi-permanent makeup procedure, not a face morph.",
].join(" ");

const BROW_POSITION = ANATOMY_RULES;

const ALL_STYLE_PROMPTS: Record<string, string> = {
  "hairstroke":
    `Microblading hair-stroke eyebrows with realistic individual fine hair lines following natural growth direction. Crisp defined strokes, darker at tail and softer at inner brow. ${BROW_POSITION} Semi-permanent Korean beauty. Photorealistic on real skin.`,
  "combo":
    `Combo eyebrows: fine hair strokes at the inner brow transitioning to soft powder shading at the tail. Natural gradient effect combining microblading and shading techniques. ${BROW_POSITION} Semi-permanent makeup. Photorealistic on real skin.`,
  "embo":
    `Machine-embossed eyebrows with uniform soft shading throughout, slightly textured surface. Even density from head to tail with natural edges. ${BROW_POSITION} Semi-permanent tattoo. Photorealistic on real skin.`,
  "powder":
    `Powder ombre eyebrows, soft gradient shading from very light inner brow to rich defined tail. Misty airbrush-like finish with no visible strokes. ${BROW_POSITION} Semi-permanent Korean beauty. Photorealistic on real skin.`,
  "natural-arch":
    `Beautiful natural arch eyebrows, soft powder brow finish, gentle curve with gradient shading from light inner brow to defined tail. ${BROW_POSITION} Semi-permanent Korean beauty style. Photorealistic on real skin.`,
  "straight":
    `Straight Korean-style flat eyebrows, even thickness throughout, natural powder finish with soft edges. ${BROW_POSITION} Semi-permanent makeup. Photorealistic on real skin.`,
  "soft-arch":
    `Softly arched eyebrows, gentle subtle curve, ombre powder brow effect fading from center outward. ${BROW_POSITION} Semi-permanent Korean beauty. Photorealistic on real skin.`,
  "feathered":
    `Feathered natural eyebrows with realistic individual hair strokes, microblading pattern. Wispy natural brow hairs. ${BROW_POSITION} Semi-permanent makeup. Photorealistic on real skin.`,
  "natural-pink":
    "Natural pink gradient lips, semi-permanent lip blush, soft ombre effect from vivid center to soft edges. Healthy natural pink tint. Photorealistic.",
  "coral":
    "Coral toned lip blush, warm peachy pink, semi-permanent lip tint. Gradient ombre from vivid center to soft edges. Photorealistic.",
  "rose":
    "Rose pink lip color, semi-permanent lip tattoo, even full coverage with natural-looking rosy color. Photorealistic.",
  "mlbb":
    "My-lips-but-better subtle lip enhancement. Semi-permanent lip blush, barely noticeable natural color correction. Photorealistic.",
  "brick-red":
    "Brick red lip color, semi-permanent lip tattoo, matte finish warm red-brown tone. Photorealistic.",
};

// Subset of ALL_STYLE_PROMPTS keys — update both when adding lip styles
const LIP_STYLES = new Set(["natural-pink", "coral", "rose", "mlbb", "brick-red"]);
const DEFAULT_STYLE = "hairstroke";

function getArea(step: SimStep, style?: string): "eyebrow" | "lip" | null {
  if (step === "remove") return "eyebrow";
  return LIP_STYLES.has(style ?? DEFAULT_STYLE) ? "lip" : "eyebrow";
}

function getPrompt(step: SimStep, style?: string): string {
  if (step === "remove") return REMOVE_PROMPT;
  // eslint-disable-next-line security/detect-object-injection -- Safe: style from known client enum
  return ALL_STYLE_PROMPTS[style ?? DEFAULT_STYLE] ?? ALL_STYLE_PROMPTS[DEFAULT_STYLE];
}

// ─── Validation ─────────────────────────────────────────────────────────────

function validateRequest(body: SimRequest): string | null {
  if (!body.image || !body.mask) return "image and mask required";
  if (!VALID_STEPS.has(body.step)) return "step must be remove or simulate";
  if (body.image.length > MAX_BASE64_LENGTH) return "image too large";
  if (body.mask.length > MAX_BASE64_LENGTH) return "mask too large";
  return null;
}

// ─── Core Generation ────────────────────────────────────────────────────────

async function generateEdit(body: SimRequest, apiKey: string): Promise<string> {
  const [imageBuffer, maskBuffer] = await Promise.all([
    prepareImage(body.image),
    convertMask(body.mask),
  ]);

  const client = new OpenAI({ apiKey });
  const result = await client.images.edit({
    model: "gpt-image-2",
    image: new File([new Uint8Array(imageBuffer)], "image.png", { type: "image/png" }),
    mask: new File([new Uint8Array(maskBuffer)], "mask.png", { type: "image/png" }),
    prompt: getPrompt(body.step, body.style),
    n: 1,
    size: "1024x1024",
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image generated");
  return b64;
}

// ─── Handler ────────────────────────────────────────────────────────────────

// 비로그인 허용. 익명은 시작 게이트(/quota)에서 발급된 bsim_anon 쿠키 보유가 전제.
async function resolveAuth(
  request: NextRequest,
): Promise<{ error: NextResponse } | { userId: string | null }> {
  const id = await resolveSimIdentity(request);

  // 비로그인인데 익명 쿠키도 없음 = 시작 게이트 미경유 직접 호출 → 차단
  if (!id.userId && id.isNewAnon) {
    return { error: NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 }) };
  }

  const subject = id.userId ?? id.anonId ?? getClientIp(request);
  const { success } = rateLimit({ key: `beauty-sim-v2:${subject}`, limit: 30, windowMs: 60_000 });
  if (!success) return { error: rateLimitResponse() };

  return { userId: id.userId };
}

function logUsage(userId: string, step: SimStep, style?: string): void {
  void (async () => {
    try {
      await createAdminClient()
        .from("sim_usage_logs")
        .insert({ user_id: userId, step, area: getArea(step, style), style: style ?? null });
    } catch (e: unknown) { console.warn("[sim-log]", e instanceof Error ? e.message : e); }
  })();
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await resolveAuth(request);
  if ("error" in auth) return auth.error;

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "서비스를 일시적으로 사용할 수 없습니다" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as SimRequest;
    const validationError = validateRequest(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const outputBase64 = await generateEdit(body, apiKey);
    // sim_usage_logs.user_id 는 NOT NULL(FK) → 로그인 사용자만 기록 (admin 통계 기존 동작 유지)
    if (auth.userId) logUsage(auth.userId, body.step, body.style);
    return NextResponse.json({ image: outputBase64, step: body.step, style: body.style });
  } catch (error: unknown) {
    // eslint-disable-next-line no-console -- Server-side error logging
    console.error("[beauty-sim-v2]", error);
    return NextResponse.json({ error: "이미지 처리에 실패했습니다. 다시 시도해주세요." }, { status: 500 });
  }
}
