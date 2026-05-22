import "server-only";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getUser } from "@/lib/supabase/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const IMAGE_MODEL = "gpt-image-2";

function buildImagePrompt(input: {
  category: string;
  procedureName: string;
  title: string;
  price: number;
  priceOrigin: number;
  discountRate: number;
  shopName: string;
}): string {
  return [
    `한국 반영구 메이크업 이벤트 홍보 배너 이미지를 생성해주세요.`,
    ``,
    `시술: ${input.procedureName} (${input.category})`,
    `이벤트: ${input.title}`,
    ``,
    `디자인 요구사항:`,
    `- 깔끔하고 고급스러운 K-뷰티 스타일 배너`,
    `- 부드러운 파스텔 톤 배경 (연핑크, 연베이지, 아이보리)`,
    `- 중앙에 큰 텍스트로 "${input.title}" 표시`,
    `- 할인율 "${input.discountRate}%" 강조 배지`,
    `- 이벤트가 "${input.price.toLocaleString()}원" 표시, 원가 "${input.priceOrigin.toLocaleString()}원" 취소선`,
    `- 하단에 샵명 "${input.shopName}" 작게 표시`,
    `- 시술 관련 미니멀 아이콘 또는 일러스트 포함`,
    `- 텍스트는 모두 한국어로 정확하게 렌더링`,
    `- 세로형 모바일 배너 비율`,
    `- 워터마크, 로고 없음`,
  ].join("\n");
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

    const input = await request.json() as {
      category: string;
      procedureName: string;
      title: string;
      price: number;
      priceOrigin: number;
      discountRate: number;
      shopName: string;
    };

    if (!input.category || !input.procedureName || !input.title) {
      return NextResponse.json({ error: "필수 항목이 누락되었습니다" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey });
    const result = await client.images.generate({
      model: IMAGE_MODEL,
      prompt: buildImagePrompt(input),
      n: 1,
      size: "1024x1536",
      quality: "medium",
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json({ error: "이미지 생성 실패" }, { status: 500 });
    }

    const buffer = Buffer.from(b64, "base64");
    const path = `${artistRow.id}/${Date.now()}_ai_banner.webp`;
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

    return NextResponse.json({ path, b64Preview: `data:image/webp;base64,${b64}` });
  } catch (e) {
    const message = e instanceof Error ? e.message : "이미지 생성 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
