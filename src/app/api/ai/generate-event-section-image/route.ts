import "server-only";
import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import { getUser } from "@/lib/supabase/auth";
import { createClient, createAdminClient, type AdminSupabaseClient } from "@/lib/supabase/server";
import { getEventStorageUrl } from "@/lib/supabase/storage-utils";
import {
  DETAIL_SECTION_TYPES,
  EDIT_SECTIONS,
  type DetailSectionType,
} from "@/lib/event/constants";
import type {
  DetailSectionCopy,
  EventFormValues,
} from "@/lib/event/types";
import {
  EVENT_CACHE_CONTROL,
  EVENT_IMAGE_BUCKET,
  EVENT_SECTION_SIZE,
  EVENT_THUMBNAIL_RESIZE_PX,
  EVENT_THUMBNAIL_SIZE,
  ImageDecodeError,
  buildEventImagePath,
  processBase64ToWebp,
  sanitizePromptValue,
} from "@/lib/event/image-service";

export const maxDuration = 180;

const IMAGE_MODEL = "gpt-image-2";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

const DEFAULT_COLOR_THEME = "soft pink and ivory";

function buildThumbnailPrompt(
  form: EventFormValues,
  copy: DetailSectionCopy,
  discountRate: number,
): string {
  const colorTheme = sanitizePromptValue(copy.detail_hero?.colorTheme, 80) || DEFAULT_COLOR_THEME;
  const procedureName = sanitizePromptValue(form.procedureName, 100);
  const price = Number(form.price).toLocaleString();
  return [
    "정사각형(1:1) 이벤트 카드 썸네일 이미지를 만들어주세요.",
    `컬러 테마: ${colorTheme}`,
    "스타일: 사실적이고 고급스러운 K-뷰티 마케팅 썸네일.",
    "만화, 일러스트, 카툰 스타일 절대 금지. 사실적 사진 기반.",
    "작은 카드 크기에서도 눈에 띄도록 시각적 임팩트에 집중.",
    "텍스트는 최소화 — 시술명과 할인율만 크고 굵게.",
    "워터마크, 로고 없음.",
    "",
    `시술명: "${procedureName}"`,
    discountRate > 0 ? `할인 배지: "${discountRate}% OFF" (눈에 잘 띄게)` : "",
    `가격: "${price}원"`,
    "",
    "중앙에 시술 결과 이미지, 부드러운 그라데이션 배경.",
    "카드 썸네일용이므로 여백 충분히, 복잡한 장식 최소화.",
  ].filter(Boolean).join("\n");
}

async function uploadEventImage(
  supabase: AdminSupabaseClient,
  path: string,
  body: Buffer,
): Promise<{ error: string | null }> {
  const { error } = await supabase.storage
    .from(EVENT_IMAGE_BUCKET)
    .upload(path, body, {
      cacheControl: EVENT_CACHE_CONTROL,
      upsert: false,
      contentType: "image/webp",
    });
  return { error: error?.message ?? null };
}

async function generateThumbnailB64(
  client: OpenAI,
  prompt: string,
): Promise<string | undefined> {
  const result = await client.images.generate({
    model: IMAGE_MODEL,
    prompt,
    n: 1,
    size: EVENT_THUMBNAIL_SIZE,
    quality: "medium",
  });
  return result.data?.[0]?.b64_json;
}

async function generateThumbnail(
  client: OpenAI,
  supabase: AdminSupabaseClient,
  artistId: string,
  timestamp: number,
  form: EventFormValues,
  copy: DetailSectionCopy,
  discountRate: number,
): Promise<string | undefined> {
  const prompt = buildThumbnailPrompt(form, copy, discountRate);

  let b64: string | undefined;
  try {
    b64 = await generateThumbnailB64(client, prompt);
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error(
      "[generate-event-section-image] thumbnail OpenAI failed:",
      err instanceof Error ? err.message : err,
    );
    return undefined;
  }
  if (!b64) return undefined;

  let resized: Buffer;
  try {
    resized = await processBase64ToWebp(b64, {
      width: EVENT_THUMBNAIL_RESIZE_PX,
      height: EVENT_THUMBNAIL_RESIZE_PX,
    });
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error(
      "[generate-event-section-image] thumbnail Sharp failed:",
      err instanceof Error ? err.message : err,
    );
    return undefined;
  }

  const storagePath = buildEventImagePath(artistId, timestamp, "thumbnail");
  const { error } = await uploadEventImage(supabase, storagePath, resized);
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[generate-event-section-image] thumbnail upload failed:", error);
    return undefined;
  }
  return storagePath;
}

function buildBaseStyle(copy: DetailSectionCopy): string {
  const colorTheme = sanitizePromptValue(copy.detail_hero?.colorTheme, 80) || DEFAULT_COLOR_THEME;
  return [
    "한국 뷰티 앱 스타일의 세로형 상세 이미지를 만들어주세요.",
    `컬러 테마: ${colorTheme}`,
    "스타일: 사실적이고 고급스러운 K-뷰티 마케팅 이미지.",
    "만화, 일러스트, 카툰 스타일 절대 금지. 사실적 사진 기반.",
    "텍스트는 모두 한국어로 정확하게 렌더링.",
    "워터마크, 로고 없음.",
    "",
  ].join("\n");
}

function buildHeroPrompt(
  baseStyle: string,
  form: EventFormValues,
  copy: DetailSectionCopy,
  discountRate: number,
): string {
  const s = copy.detail_hero;
  const shopName = sanitizePromptValue(form.shopName, 100);
  const price = Number(form.price).toLocaleString();
  const priceOrigin = Number(form.priceOrigin).toLocaleString();
  return [
    baseStyle,
    "이 사진을 활용해서 전문적인 마케팅 배너를 디자인해주세요.",
    "사진 속 인물/시술 결과를 자연스럽게 유지하면서 디자인 요소를 추가합니다.",
    "",
    `상단에 큰 한국어 텍스트: "${sanitizePromptValue(s.headline, 100)}"`,
    `서브 텍스트: "${sanitizePromptValue(s.subtext, 200)}"`,
    `할인율 배지: "${discountRate}% OFF"`,
    `이벤트가: "${price}원"`,
    `원가: "${priceOrigin}원" (취소선)`,
    `하단에 샵명: "${shopName}"`,
    "",
    "부드러운 그라데이션 배경, 별/하트 반짝이 장식, 프리미엄 느낌.",
  ].join("\n");
}

function buildIntroPrompt(
  baseStyle: string,
  form: EventFormValues,
  copy: DetailSectionCopy,
): string {
  const s = copy.detail_intro;
  const procedureDuration = sanitizePromptValue(form.procedureDuration, 50);
  const maintenancePeriod = sanitizePromptValue(form.maintenancePeriod, 50);
  return [
    baseStyle,
    "반영구 시술 소개 섹션 이미지를 생성해주세요.",
    "",
    `제목: "${sanitizePromptValue(s.heading, 100)}"`,
    `본문: "${sanitizePromptValue(s.bodyText, 500)}"`,
    "",
    "장점 3개 (아이콘 + 텍스트):",
    ...s.benefits.map((b, i) => `  ${i + 1}. "${sanitizePromptValue(b, 200)}"`),
    "",
    procedureDuration ? `시술 시간: ${procedureDuration}` : "",
    maintenancePeriod ? `유지 기간: ${maintenancePeriod}` : "",
    "",
    "깔끔한 카드 레이아웃. 아이콘은 심플한 라인 아이콘.",
    "배경은 밝고 깨끗한 톤. 전문적 정보 전달 느낌.",
  ].filter(Boolean).join("\n");
}

function buildBeforeAfterPrompt(baseStyle: string, copy: DetailSectionCopy): string {
  const s = copy.detail_before_after;
  return [
    baseStyle,
    "이 시술 전후 사진을 활용해서 Before/After 비교 이미지를 만들어주세요.",
    "사진을 자연스럽게 유지하면서 디자인 프레임을 추가합니다.",
    "",
    `제목: "${sanitizePromptValue(s.heading, 100)}"`,
    `캡션: "${sanitizePromptValue(s.caption, 200)}"`,
    "",
    "좌우 또는 상하 분할 레이아웃.",
    '"Before" / "After" 라벨 표시.',
    "구분선과 프레임으로 깔끔하게.",
    "신뢰감 있는 전문적 느낌.",
  ].join("\n");
}

function buildAudiencePrompt(baseStyle: string, copy: DetailSectionCopy): string {
  const s = copy.detail_audience;
  return [
    baseStyle,
    "시술 추천 대상 섹션 이미지를 생성해주세요.",
    "",
    `제목: "${sanitizePromptValue(s.heading, 100)}"`,
    "",
    "추천 대상 목록:",
    ...s.items.map((item) => `  ${sanitizePromptValue(item.emoji, 10)} "${sanitizePromptValue(item.text, 100)}"`),
    "",
    "체크마크 또는 이모지 아이콘과 함께 리스트 형태.",
    "따뜻하고 공감가는 톤. 부드러운 배경색.",
    "한국 여성이 공감할 수 있는 친근한 느낌.",
  ].join("\n");
}

function buildProcessPrompt(baseStyle: string, copy: DetailSectionCopy): string {
  const s = copy.detail_process ?? { heading: "시술 과정", steps: [], precautions: [] };
  const steps = Array.isArray(s.steps) ? s.steps : [];
  const precautions = Array.isArray(s.precautions) ? s.precautions : [];
  return [
    baseStyle,
    "뷰티 시술 안내 인포그래픽 이미지를 생성해주세요.",
    "",
    `제목: "${sanitizePromptValue(s.heading, 100)}"`,
    "",
    steps.length > 0 ? "진행 순서:" : "",
    ...steps.map((step, i) => `  ${i + 1}. "${sanitizePromptValue(step, 200)}"`),
    "",
    precautions.length > 0 ? "참고사항:" : "",
    ...precautions.map((p) => `  "${sanitizePromptValue(p, 200)}"`),
    "",
    "깔끔한 인포그래픽 스타일. 번호와 아이콘 활용.",
    "스텝 바이 스텝 시각적 플로우.",
  ].filter(Boolean).join("\n");
}

function buildShopPrompt(baseStyle: string, copy: DetailSectionCopy): string {
  const s = copy.detail_shop;
  return [
    baseStyle,
    "이 샵 사진을 활용해서 샵 정보 안내 이미지를 만들어주세요.",
    "사진을 자연스럽게 유지하면서 정보 오버레이를 추가합니다.",
    "",
    `제목: "${sanitizePromptValue(s.heading, 100)}"`,
    "",
    "정보:",
    ...s.details.map((d) => `  📍 "${sanitizePromptValue(d, 200)}"`),
    "",
    "지도 핀 아이콘, 시계 아이콘 등 정보성 아이콘 활용.",
    "반투명 정보 카드 오버레이. 깔끔하고 읽기 쉽게.",
  ].join("\n");
}

function buildCtaPrompt(
  baseStyle: string,
  form: EventFormValues,
  copy: DetailSectionCopy,
): string {
  const s = copy.detail_cta;
  const eventPeriodText = sanitizePromptValue(form.eventPeriodText, 200);
  const price = Number(form.price).toLocaleString();
  return [
    baseStyle,
    "예약 유도 CTA 섹션 이미지를 생성해주세요.",
    "",
    `제목: "${sanitizePromptValue(s.heading, 100)}"`,
    `긴급 문구: "${sanitizePromptValue(s.urgencyText, 200)}"`,
    `버튼 텍스트: "${sanitizePromptValue(s.ctaButton, 50)}"`,
    "",
    `이벤트가: "${price}원"`,
    eventPeriodText ? `기간: "${eventPeriodText}"` : "",
    "",
    "큰 CTA 버튼 디자인. 그라데이션 또는 강조색.",
    "긴급감과 혜택을 동시에 전달.",
    "하단 마무리 느낌. 브랜드 컬러 활용.",
  ].filter(Boolean).join("\n");
}

function buildSectionPrompt(
  sectionType: DetailSectionType,
  form: EventFormValues,
  copy: DetailSectionCopy,
  discountRate: number,
): string {
  const baseStyle = buildBaseStyle(copy);

  switch (sectionType) {
    case "detail_hero":
      return buildHeroPrompt(baseStyle, form, copy, discountRate);
    case "detail_intro":
      return buildIntroPrompt(baseStyle, form, copy);
    case "detail_before_after":
      return buildBeforeAfterPrompt(baseStyle, copy);
    case "detail_audience":
      return buildAudiencePrompt(baseStyle, copy);
    case "detail_process":
      return buildProcessPrompt(baseStyle, copy);
    case "detail_shop":
      return buildShopPrompt(baseStyle, copy);
    case "detail_cta":
      return buildCtaPrompt(baseStyle, form, copy);
    default: {
      const _exhaustive: never = sectionType;
      throw new Error(`Unknown section type: ${_exhaustive}`);
    }
  }
}

type ParsedRequest = {
  sectionType: DetailSectionType;
  form: EventFormValues;
  copy: DetailSectionCopy;
  discountRate: number;
  isEditSection: boolean;
  imageFile: File | null;
};

function validateImageFile(
  sectionType: DetailSectionType,
  isEditSection: boolean,
  imageFile: File | null,
): NextResponse | null {
  if (isEditSection && !imageFile) {
    return NextResponse.json({ error: `${sectionType}는 이미지가 필요합니다` }, { status: 400 });
  }
  if (imageFile) {
    if (imageFile.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "이미지 파일은 10MB 이하여야 합니다" }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
      return NextResponse.json({ error: "이미지 형식은 PNG, JPEG, WebP만 가능합니다" }, { status: 400 });
    }
  }
  return null;
}

function parseSectionPayload(
  sectionTypeRaw: FormDataEntryValue | null,
  formDataJson: FormDataEntryValue | null,
  copyDataJson: FormDataEntryValue | null,
): { sectionType: DetailSectionType; form: EventFormValues; copy: DetailSectionCopy } | NextResponse {
  if (
    typeof sectionTypeRaw !== "string" ||
    typeof formDataJson !== "string" ||
    typeof copyDataJson !== "string"
  ) {
    return NextResponse.json({ error: "sectionType, formData, copyData 필수 (string)" }, { status: 400 });
  }

  if (!DETAIL_SECTION_TYPES.includes(sectionTypeRaw as DetailSectionType)) {
    return NextResponse.json({ error: "유효하지 않은 섹션 타입" }, { status: 400 });
  }
  const sectionType = sectionTypeRaw as DetailSectionType;

  let form: EventFormValues;
  let copy: DetailSectionCopy;
  try {
    form = JSON.parse(formDataJson) as EventFormValues;
    copy = JSON.parse(copyDataJson) as DetailSectionCopy;
  } catch {
    return NextResponse.json({ error: "잘못된 JSON 형식" }, { status: 400 });
  }

  if (!form.procedureName || !form.title || !copy.detail_hero) {
    return NextResponse.json({ error: "필수 데이터 누락" }, { status: 400 });
  }

  return { sectionType, form, copy };
}

async function parseSectionRequest(
  request: NextRequest,
): Promise<ParsedRequest | NextResponse> {
  const formData = await request.formData();
  const discountRateStr = formData.get("discountRate");
  const imageFile = formData.get("image") as File | null;

  const payload = parseSectionPayload(
    formData.get("sectionType"),
    formData.get("formData"),
    formData.get("copyData"),
  );
  if (payload instanceof NextResponse) {
    return payload;
  }
  const { sectionType, form, copy } = payload;

  const discountRate = Number(typeof discountRateStr === "string" ? discountRateStr : "0") || 0;

  const isEditSection = EDIT_SECTIONS.includes(sectionType);
  const imageError = validateImageFile(sectionType, isEditSection, imageFile);
  if (imageError) {
    return imageError;
  }

  return { sectionType, form, copy, discountRate, isEditSection, imageFile };
}

async function generateSectionB64(
  client: OpenAI,
  prompt: string,
  isEditSection: boolean,
  imageFile: File | null,
): Promise<string | undefined> {
  if (isEditSection && imageFile) {
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const result = await client.images.edit({
      model: IMAGE_MODEL,
      image: await toFile(imageBuffer, "input.png", { type: "image/png" }),
      prompt,
      size: EVENT_SECTION_SIZE,
    });
    return result.data?.[0]?.b64_json;
  }
  const result = await client.images.generate({
    model: IMAGE_MODEL,
    prompt,
    n: 1,
    size: EVENT_SECTION_SIZE,
    quality: "medium",
  });
  return result.data?.[0]?.b64_json;
}

async function resolveArtistId(userId: string): Promise<string | NextResponse> {
  const supabaseRead = await createClient();
  const { data: artistRow } = await supabaseRead
    .from("artists")
    .select("id")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!artistRow) {
    return NextResponse.json({ error: "아티스트 계정이 필요합니다" }, { status: 403 });
  }
  return artistRow.id;
}

async function buildProcessedImage(
  client: OpenAI,
  prompt: string,
  parsed: ParsedRequest,
): Promise<Buffer | NextResponse> {
  const { sectionType, isEditSection, imageFile } = parsed;

  let b64: string | undefined;
  try {
    b64 = await generateSectionB64(client, prompt, isEditSection, imageFile);
  } catch (openaiErr: unknown) {
    // eslint-disable-next-line no-console
    console.error(`[generate-event-section-image] ${sectionType}:`, openaiErr);
    return NextResponse.json(
      { error: `이미지 생성에 실패했습니다 (${sectionType}). 잠시 후 다시 시도해주세요.` },
      { status: 502 },
    );
  }

  if (!b64) {
    return NextResponse.json({ error: "이미지 데이터가 비어있습니다" }, { status: 500 });
  }

  try {
    return await processBase64ToWebp(b64);
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error(`[generate-event-section-image] ${sectionType} Sharp:`, err);
    const status = err instanceof ImageDecodeError ? 400 : 500;
    return NextResponse.json({ error: "이미지 변환 실패" }, { status });
  }
}

async function finalizeSectionImage(
  client: OpenAI,
  artistId: string,
  prompt: string,
  processed: Buffer,
  parsed: ParsedRequest,
): Promise<NextResponse> {
  const { sectionType, form, copy, discountRate } = parsed;

  const uploadTimestamp = Date.now();
  const path = buildEventImagePath(artistId, uploadTimestamp, sectionType);
  const supabase = createAdminClient();

  const { error: uploadError } = await uploadEventImage(supabase, path, processed);

  if (uploadError) {
    return NextResponse.json({ error: `업로드 실패: ${uploadError}` }, { status: 500 });
  }

  const thumbnailPath = sectionType === "detail_hero"
    ? await generateThumbnail(client, supabase, artistId, uploadTimestamp, form, copy, discountRate)
    : undefined;

  const previewUrl = getEventStorageUrl(path);

  return NextResponse.json({
    sectionType,
    storagePath: path,
    previewUrl,
    altText: "",
    prompt,
    ...(thumbnailPath ? { thumbnailPath } : {}),
  });
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

    const artistId = await resolveArtistId(user.id);
    if (artistId instanceof NextResponse) {
      return artistId;
    }

    const parsed = await parseSectionRequest(request);
    if (parsed instanceof NextResponse) {
      return parsed;
    }

    const client = new OpenAI({ apiKey, timeout: 120_000 });
    const prompt = buildSectionPrompt(parsed.sectionType, parsed.form, parsed.copy, parsed.discountRate);

    const processed = await buildProcessedImage(client, prompt, parsed);
    if (processed instanceof NextResponse) {
      return processed;
    }

    return await finalizeSectionImage(client, artistId, prompt, processed, parsed);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "섹션 이미지 생성 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
