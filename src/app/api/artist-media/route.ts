import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

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

  const body = await request.json() as {
    artistId: string;
    storagePath?: string;
    type?: string;
    orderIndex?: number;
    profileImagePath?: string;
  };

  if (!body.artistId) {
    return NextResponse.json({ error: "artistId is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify the artist belongs to this user
  const { data: artist } = await admin
    .from("artists")
    .select("id, user_id")
    .eq("id", body.artistId)
    .single();

  if (!artist || (artist as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Update profile_image_path if provided
  if (body.profileImagePath !== undefined) {
    await admin
      .from("artists")
      .update({ profile_image_path: body.profileImagePath })
      .eq("id", body.artistId);
  }

  // Insert artist_media if storagePath provided
  if (body.storagePath) {
    const { error: mediaError } = await admin
      .from("artist_media")
      .insert({
        artist_id: body.artistId,
        storage_path: body.storagePath,
        type: (body.type ?? "image") as "image" | "video",
        order_index: body.orderIndex ?? 0,
      });

    if (mediaError) {
      return NextResponse.json({ error: mediaError.message }, { status: 500 });
    }
  }

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
  const { data: artist } = await admin
    .from("artists")
    .select("id, user_id")
    .eq("id", body.artistId)
    .single();

  if (!artist || (artist as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await admin.from("artist_media").delete().in("id", body.mediaIds);

  return NextResponse.json({ success: true });
}
