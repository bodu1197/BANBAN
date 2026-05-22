import "server-only";
import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import { getUser } from "@/lib/supabase/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const IMAGE_MODEL = "gpt-image-2";

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
    const imageFile = formData.get("image") as File | null;
    const editPrompt = formData.get("prompt") as string | null;

    if (!imageFile || !editPrompt) {
      return NextResponse.json({ error: "image, prompt 필수" }, { status: 400 });
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (imageFile.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "이미지 파일은 10MB 이하여야 합니다" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey });
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

    const result = await client.images.edit({
      model: IMAGE_MODEL,
      image: await toFile(imageBuffer, "input.png", { type: "image/png" }),
      prompt: [
        "한국 반영구 메이크업 시술 사진을 보정해주세요.",
        editPrompt,
        "자연스러운 보정만 적용하고, 원본의 시술 결과는 왜곡하지 마세요.",
        "전문적이고 깔끔한 느낌으로 밝기와 색감을 보정해주세요.",
      ].join(" "),
      size: "1024x1024",
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json({ error: "이미지 편집 실패" }, { status: 500 });
    }

    const buffer = Buffer.from(b64, "base64");
    const path = `${artistRow.id}/${Date.now()}_ai_edited.webp`;
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
    const message = e instanceof Error ? e.message : "이미지 편집 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
