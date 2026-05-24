import "server-only";
import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import { getUser } from "@/lib/supabase/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  DETAIL_SECTION_TYPES,
  EDIT_SECTIONS,
  type DetailSectionType,
} from "@/lib/event/constants";
import type {
  DetailSectionCopy,
  EventFormValues,
} from "@/lib/event/types";

export const maxDuration = 180;

const IMAGE_MODEL = "gpt-image-2";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const THUMBNAIL_RESIZE = 480;

const DEFAULT_COLOR_THEME = "soft pink and ivory";

function buildThumbnailPrompt(
  form: EventFormValues,
  copy: DetailSectionCopy,
  discountRate: number,
): string {
  const colorTheme = copy.detail_hero?.colorTheme || DEFAULT_COLOR_THEME;
  return [
    "정사각형(1:1) 이벤트 카드 썸네일 이미지를 만들어주세요.",
    `컬러 테마: ${colorTheme}`,
    "스타일: 사실적이고 고급스러운 K-뷰티 마케팅 썸네일.",
    "만화, 일러스트, 카툰 스타일 절대 금지. 사실적 사진 기반.",
    "작은 카드 크기에서도 눈에 띄도록 시각적 임팩트에 집중.",
    "텍스트는 최소화 — 시술명과 할인율만 크고 굵게.",
    "워터마크, 로고 없음.",
    "",
    `시술명: "${form.procedureName}"`,
    discountRate > 0 ? `할인 배지: "${discountRate}% OFF" (눈에 잘 띄게)` : "",
    `가격: "${Number(form.price).toLocaleString()}원"`,
    "",
    "중앙에 시술 결과 이미지, 부드러운 그라데이션 배경.",
    "카드 썸네일용이므로 여백 충분히, 복잡한 장식 최소화.",
  ].filter(Boolean).join("\n");
}

async function generateThumbnail(
  client: OpenAI,
  supabase: ReturnType<typeof createAdminClient>,
  artistId: string,
  timestamp: number,
  form: EventFormValues,
  copy: DetailSectionCopy,
  discountRate: number,
): Promise<string | undefined> {
  try {
    const prompt = buildThumbnailPrompt(form, copy, discountRate);
    const result = await client.images.generate({
      model: IMAGE_MODEL,
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "medium",
    });
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) return undefined;

    const resized = await sharp(Buffer.from(b64, "base64"))
      .resize(THUMBNAIL_RESIZE, THUMBNAIL_RESIZE)
      .webp({ quality: 80 })
      .toBuffer();

    const storagePath = `${artistId}/${timestamp}_thumbnail.webp`;
    const { error } = await supabase.storage
      .from("events")
      .upload(storagePath, resized, {
        cacheControl: "31536000",
        upsert: false,
        contentType: "image/webp",
      });
    return error ? undefined : storagePath;
  } catch (thumbErr: unknown) {
    // eslint-disable-next-line no-console
    console.error("[generate-event-section-image] thumbnail failed (non-fatal):", thumbErr instanceof Error ? thumbErr.message : thumbErr);
    return undefined;
  }
}

function buildSectionPrompt(
  sectionType: DetailSectionType,
  form: EventFormValues,
  copy: DetailSectionCopy,
  discountRate: number,
): string {
  const colorTheme = copy.detail_hero?.colorTheme || DEFAULT_COLOR_THEME;
  const baseStyle = [
    "한국 뷰티 앱 스타일의 세로형 상세 이미지를 만들어주세요.",
    `컬러 테마: ${colorTheme}`,
    "스타일: 사실적이고 고급스러운 K-뷰티 마케팅 이미지.",
    "만화, 일러스트, 카툰 스타일 절대 금지. 사실적 사진 기반.",
    "텍스트는 모두 한국어로 정확하게 렌더링.",
    "워터마크, 로고 없음.",
    "",
  ].join("\n");

  switch (sectionType) {
    case "detail_hero": {
      const s = copy.detail_hero;
      return [
        baseStyle,
        "이 사진을 활용해서 전문적인 마케팅 배너를 디자인해주세요.",
        "사진 속 인물/시술 결과를 자연스럽게 유지하면서 디자인 요소를 추가합니다.",
        "",
        `상단에 큰 한국어 텍스트: "${s.headline}"`,
        `서브 텍스트: "${s.subtext}"`,
        `할인율 배지: "${discountRate}% OFF"`,
        `이벤트가: "${Number(form.price).toLocaleString()}원"`,
        `원가: "${Number(form.priceOrigin).toLocaleString()}원" (취소선)`,
        `하단에 샵명: "${form.shopName}"`,
        "",
        "부드러운 그라데이션 배경, 별/하트 반짝이 장식, 프리미엄 느낌.",
      ].join("\n");
    }
    case "detail_intro": {
      const s = copy.detail_intro;
      return [
        baseStyle,
        "반영구 시술 소개 섹션 이미지를 생성해주세요.",
        "",
        `제목: "${s.heading}"`,
        `본문: "${s.bodyText}"`,
        "",
        "장점 3개 (아이콘 + 텍스트):",
        ...s.benefits.map((b, i) => `  ${i + 1}. "${b}"`),
        "",
        form.procedureDuration ? `시술 시간: ${form.procedureDuration}` : "",
        form.maintenancePeriod ? `유지 기간: ${form.maintenancePeriod}` : "",
        "",
        "깔끔한 카드 레이아웃. 아이콘은 심플한 라인 아이콘.",
        "배경은 밝고 깨끗한 톤. 전문적 정보 전달 느낌.",
      ].filter(Boolean).join("\n");
    }
    case "detail_before_after": {
      const s = copy.detail_before_after;
      return [
        baseStyle,
        "이 시술 전후 사진을 활용해서 Before/After 비교 이미지를 만들어주세요.",
        "사진을 자연스럽게 유지하면서 디자인 프레임을 추가합니다.",
        "",
        `제목: "${s.heading}"`,
        `캡션: "${s.caption}"`,
        "",
        "좌우 또는 상하 분할 레이아웃.",
        '"Before" / "After" 라벨 표시.',
        "구분선과 프레임으로 깔끔하게.",
        "신뢰감 있는 전문적 느낌.",
      ].join("\n");
    }
    case "detail_audience": {
      const s = copy.detail_audience;
      return [
        baseStyle,
        "시술 추천 대상 섹션 이미지를 생성해주세요.",
        "",
        `제목: "${s.heading}"`,
        "",
        "추천 대상 목록:",
        ...s.items.map((item) => `  ${item.emoji} "${item.text}"`),
        "",
        "체크마크 또는 이모지 아이콘과 함께 리스트 형태.",
        "따뜻하고 공감가는 톤. 부드러운 배경색.",
        "한국 여성이 공감할 수 있는 친근한 느낌.",
      ].join("\n");
    }
    case "detail_process": {
      const s = copy.detail_process ?? { heading: "시술 과정", steps: [], precautions: [] };
      const steps = Array.isArray(s.steps) ? s.steps : [];
      const precautions = Array.isArray(s.precautions) ? s.precautions : [];
      return [
        baseStyle,
        "뷰티 시술 안내 인포그래픽 이미지를 생성해주세요.",
        "",
        `제목: "${s.heading}"`,
        "",
        steps.length > 0 ? "진행 순서:" : "",
        ...steps.map((step, i) => `  ${i + 1}. "${step}"`),
        "",
        precautions.length > 0 ? "참고사항:" : "",
        ...precautions.map((p) => `  "${p}"`),
        "",
        "깔끔한 인포그래픽 스타일. 번호와 아이콘 활용.",
        "스텝 바이 스텝 시각적 플로우.",
      ].filter(Boolean).join("\n");
    }
    case "detail_shop": {
      const s = copy.detail_shop;
      return [
        baseStyle,
        "이 샵 사진을 활용해서 샵 정보 안내 이미지를 만들어주세요.",
        "사진을 자연스럽게 유지하면서 정보 오버레이를 추가합니다.",
        "",
        `제목: "${s.heading}"`,
        "",
        "정보:",
        ...s.details.map((d) => `  📍 "${d}"`),
        "",
        "지도 핀 아이콘, 시계 아이콘 등 정보성 아이콘 활용.",
        "반투명 정보 카드 오버레이. 깔끔하고 읽기 쉽게.",
      ].join("\n");
    }
    case "detail_cta": {
      const s = copy.detail_cta;
      return [
        baseStyle,
        "예약 유도 CTA 섹션 이미지를 생성해주세요.",
        "",
        `제목: "${s.heading}"`,
        `긴급 문구: "${s.urgencyText}"`,
        `버튼 텍스트: "${s.ctaButton}"`,
        "",
        `이벤트가: "${Number(form.price).toLocaleString()}원"`,
        form.eventPeriodText ? `기간: "${form.eventPeriodText}"` : "",
        "",
        "큰 CTA 버튼 디자인. 그라데이션 또는 강조색.",
        "긴급감과 혜택을 동시에 전달.",
        "하단 마무리 느낌. 브랜드 컬러 활용.",
      ].filter(Boolean).join("\n");
    }
    default: {
      const _exhaustive: never = sectionType;
      throw new Error(`Unknown section type: ${_exhaustive}`);
    }
  }
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

    const supabaseRead = await createClient();
    const { data: artistRow } = await supabaseRead
      .from("artists")
      .select("id")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!artistRow) {
      return NextResponse.json({ error: "아티스트 계정이 필요합니다" }, { status: 403 });
    }

    const formData = await request.formData();
    const sectionTypeRaw = formData.get("sectionType");
    const formDataJson = formData.get("formData");
    const copyDataJson = formData.get("copyData");
    const discountRateStr = formData.get("discountRate");
    const imageFile = formData.get("image") as File | null;

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

    const discountRate = Number(typeof discountRateStr === "string" ? discountRateStr : "0") || 0;

    const isEditSection = EDIT_SECTIONS.includes(sectionType);
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

    const client = new OpenAI({ apiKey, timeout: 120_000 });
    const prompt = buildSectionPrompt(sectionType, form, copy, discountRate);

    let b64: string | undefined;

    try {
      if (isEditSection && imageFile) {
        const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
        const result = await client.images.edit({
          model: IMAGE_MODEL,
          image: await toFile(imageBuffer, "input.png", { type: "image/png" }),
          prompt,
          size: "1024x1536",
        });
        b64 = result.data?.[0]?.b64_json;
      } else {
        const result = await client.images.generate({
          model: IMAGE_MODEL,
          prompt,
          n: 1,
          size: "1024x1536",
          quality: "medium",
        });
        b64 = result.data?.[0]?.b64_json;
      }
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

    const buffer = Buffer.from(b64, "base64");
    const uploadTimestamp = Date.now();
    const path = `${artistRow.id}/${uploadTimestamp}_${sectionType}.webp`;
    const supabase = createAdminClient();

    const { error: uploadError } = await supabase.storage
      .from("events")
      .upload(path, buffer, {
        cacheControl: "31536000",
        upsert: false,
        contentType: "image/webp",
      });

    if (uploadError) {
      return NextResponse.json({ error: `업로드 실패: ${uploadError.message}` }, { status: 500 });
    }

    const thumbnailPath = sectionType === "detail_hero"
      ? await generateThumbnail(client, supabase, artistRow.id, uploadTimestamp, form, copy, discountRate)
      : undefined;

    return NextResponse.json({
      sectionType,
      storagePath: path,
      b64Preview: `data:image/webp;base64,${b64}`,
      altText: "",
      prompt,
      ...(thumbnailPath ? { thumbnailPath } : {}),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "섹션 이미지 생성 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
