import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: NextRequest): Promise<NextResponse> {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "이미지 파일만 업로드 가능합니다" }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "파일 크기는 5MB 이하여야 합니다" }, { status: 400 });

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${uuidv4()}.${ext}`;
    const supabase = createAdminClient();

    const { error } = await supabase.storage
        .from("inquiries")
        .upload(path, file, { contentType: file.type, upsert: false });

    if (error) return NextResponse.json({ error: `업로드 실패: ${error.message}` }, { status: 500 });

    const url = `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim()}/storage/v1/object/public/inquiries/${path}`;
    return NextResponse.json({ url });
}
