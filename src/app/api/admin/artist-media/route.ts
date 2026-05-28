import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { sanitizeStoragePath } from "@/lib/supabase/storage-utils";

interface PostBody {
  artistId: string;
  storagePath: string;
  type?: "image" | "video";
  orderIndex?: number;
}

interface DeleteBody {
  artistId: string;
  mediaIds: string[];
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** POST /api/admin/artist-media — admin 전용 갤러리 추가 (본인 검증 없이 artist_id 직접) */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json() as PostBody;
  if (!body.artistId || !UUID_REGEX.test(body.artistId)) {
    return NextResponse.json({ error: "유효한 artistId 가 필요합니다." }, { status: 400 });
  }
  if (!body.storagePath) {
    return NextResponse.json({ error: "storagePath 가 필요합니다." }, { status: 400 });
  }
  const safePath = sanitizeStoragePath(body.storagePath);
  if (!safePath) {
    return NextResponse.json({ error: "유효하지 않은 storagePath 입니다." }, { status: 400 });
  }

  const { error } = await auth.supabase.from("artist_media").insert({
    artist_id: body.artistId,
    storage_path: safePath,
    type: body.type ?? "image",
    order_index: body.orderIndex ?? 0,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

/** DELETE /api/admin/artist-media — admin 전용 갤러리 삭제. artist_id 일치 항목만 삭제 (다른 아티스트 미디어 변조 방지). */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json() as DeleteBody;
  if (!body.artistId || !UUID_REGEX.test(body.artistId)) {
    return NextResponse.json({ error: "유효한 artistId 가 필요합니다." }, { status: 400 });
  }
  if (!Array.isArray(body.mediaIds) || body.mediaIds.length === 0) {
    return NextResponse.json({ error: "mediaIds 가 필요합니다." }, { status: 400 });
  }
  // mediaIds 도 UUID 형식 검증 (인젝션 방어 + 안전 보장)
  if (!body.mediaIds.every((m) => UUID_REGEX.test(m))) {
    return NextResponse.json({ error: "유효한 mediaIds 형식이 아닙니다." }, { status: 400 });
  }

  // artist_id 일치 확인을 .eq() 로 강제 — 다른 artist 의 미디어 ID 가 섞여도 삭제 안 됨
  const { error } = await auth.supabase
    .from("artist_media")
    .delete()
    .eq("artist_id", body.artistId)
    .in("id", body.mediaIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
