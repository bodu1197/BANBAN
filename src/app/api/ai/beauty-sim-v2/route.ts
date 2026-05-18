import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

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
  "Smooth natural skin with no eyebrows at all. Natural forehead skin tone and texture continuing seamlessly where eyebrows were. No hair, no shadow, no stubble, no residual marks. Photorealistic skin matching surrounding color and lighting exactly.";

const ALL_STYLE_PROMPTS: Record<string, string> = {
  "natural-arch":
    "Beautiful natural arch eyebrows, soft powder brow finish, gentle curve with gradient shading from light inner brow to defined tail. Semi-permanent Korean beauty style. Photorealistic on real skin.",
  "straight":
    "Straight Korean-style flat eyebrows, even thickness throughout, natural powder finish with soft edges. Semi-permanent makeup. Photorealistic on real skin.",
  "soft-arch":
    "Softly arched eyebrows, gentle subtle curve, ombre powder brow effect fading from center outward. Semi-permanent Korean beauty. Photorealistic on real skin.",
  "feathered":
    "Feathered natural eyebrows with realistic individual hair strokes, microblading pattern. Wispy natural brow hairs. Semi-permanent makeup. Photorealistic on real skin.",
  "bold-arch":
    "Bold defined arched eyebrows, strong shape with crisp edges, microblading hair-stroke pattern. Semi-permanent makeup. Photorealistic on real skin.",
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

const DEFAULT_STYLE = "natural-arch";

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

async function checkAuth(request: NextRequest): Promise<NextResponse | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const key = `beauty-sim-v2:${user?.id ?? getClientIp(request)}`;
  const { success } = rateLimit({ key, limit: 30, windowMs: 60_000 });
  if (!success) return rateLimitResponse();
  return null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const blocked = await checkAuth(request);
  if (blocked) return blocked;

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
    return NextResponse.json({ image: outputBase64, step: body.step, style: body.style });
  } catch (error: unknown) {
    // eslint-disable-next-line no-console -- Server-side error logging
    console.error("[beauty-sim-v2]", error);
    return NextResponse.json({ error: "이미지 처리에 실패했습니다. 다시 시도해주세요." }, { status: 500 });
  }
}
