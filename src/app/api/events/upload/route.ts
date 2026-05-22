import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import sharp from "sharp";

export const maxDuration = 60;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
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
    const file = formData.get("file");
    const mediaType = formData.get("mediaType");
    const orderIndex = formData.get("orderIndex");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    }
    if (typeof mediaType !== "string") {
      return NextResponse.json({ error: "mediaType이 필요합니다" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "파일 크기는 10MB 이하여야 합니다" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(buffer).metadata();
    if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
      return NextResponse.json({ error: "이미지 형식은 PNG, JPEG, WebP만 가능합니다" }, { status: 400 });
    }

    const optimized = await sharp(buffer)
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const path = `${artistRow.id}/${crypto.randomUUID()}.webp`;
    const supabase = createAdminClient();

    const { error: uploadError } = await supabase.storage
      .from("events")
      .upload(path, optimized, {
        cacheControl: "86400",
        upsert: false,
        contentType: "image/webp",
      });

    if (uploadError) {
      console.error("[events/upload]", uploadError.message);
      return NextResponse.json({ error: "이미지 업로드에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({
      storage_path: path,
      media_type: mediaType,
      order_index: Number(typeof orderIndex === "string" ? orderIndex : "0"),
    });
  } catch (e) {
    console.error("[events/upload]", e);
    return NextResponse.json({ error: "이미지 업로드에 실패했습니다" }, { status: 500 });
  }
}
