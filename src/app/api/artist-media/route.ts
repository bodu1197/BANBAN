import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isSafeStoragePath } from "@/lib/supabase/storage-utils";

interface PostBody {
  artistId: string;
  profileImagePath?: string;
  bannerPath?: string;
}

/**
 * Update profile image and/or banner path. (샵갤러리(artist_media) 업로드는 폐지 — 배너로 일원화.)
 */
async function handleMediaUpsert(admin: ReturnType<typeof createAdminClient>, body: PostBody): Promise<NextResponse | null> {
  if (body.profileImagePath !== undefined) {
    await admin
      .from("artists")
      .update({ profile_image_path: body.profileImagePath })
      .eq("id", body.artistId);
  }

  if (body.bannerPath !== undefined) {
    await admin
      .from("artists")
      .update({ banner_path: body.bannerPath })
      .eq("id", body.artistId);
  }

  return null;
}

/**
 * Validate POST body — required artistId + safe storage paths.
 * Returns an error response, or null when the body is valid.
 */
function validatePostBody(body: PostBody): NextResponse | null {
  if (!body.artistId) {
    return NextResponse.json({ error: "artistId is required" }, { status: 400 });
  }

  // 쓰기 경계 검증 — 외부 URL/경로 탈출 주입 차단 (스토리지 경로만 허용).
  if (body.profileImagePath && !isSafeStoragePath(body.profileImagePath)) {
    return NextResponse.json({ error: "유효하지 않은 이미지 경로입니다." }, { status: 400 });
  }
  if (body.bannerPath && !isSafeStoragePath(body.bannerPath)) {
    return NextResponse.json({ error: "유효하지 않은 배너 경로입니다." }, { status: 400 });
  }

  return null;
}

/**
 * Verify the artist row belongs to the given user.
 * Returns a forbidden response, or null when ownership is confirmed.
 */
async function verifyArtistOwnership(
  admin: ReturnType<typeof createAdminClient>,
  artistId: string,
  userId: string,
): Promise<NextResponse | null> {
  const { data: artist } = await admin
    .from("artists")
    .select("id, user_id")
    .eq("id", artistId)
    .single();

  if (!artist || (artist as { user_id: string }).user_id !== userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return null;
}

/**
 * POST /api/artist-media
 * Insert artist_media row + optionally update profile_image_path
 * Bypasses RLS by using admin client for writes
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json() as PostBody;

  const validationError = validatePostBody(body);
  if (validationError) return validationError;

  const admin = createAdminClient();

  // Verify the artist belongs to this user
  const ownershipError = await verifyArtistOwnership(admin, body.artistId, user.id);
  if (ownershipError) return ownershipError;

  const errorResponse = await handleMediaUpsert(admin, body);
  if (errorResponse) return errorResponse;

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/artist-media
 * Delete artist_media rows by IDs
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json() as { artistId: string; mediaIds: string[] };
  if (!body.artistId || !body.mediaIds?.length) {
    return NextResponse.json({ error: "artistId and mediaIds required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify ownership
  const ownershipError = await verifyArtistOwnership(admin, body.artistId, user.id);
  if (ownershipError) return ownershipError;

  await admin.from("artist_media").delete().in("id", body.mediaIds);

  return NextResponse.json({ success: true });
}
