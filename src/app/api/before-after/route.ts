import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const ARTIST_SELECT = "id, user_id" as const;

/**
 * Verify the artist belongs to the authenticated user
 */
async function verifyOwnership(
  admin: ReturnType<typeof createAdminClient>,
  artistId: string,
  userId: string,
): Promise<boolean> {
  const { data: artist } = await admin
    .from("artists")
    .select(ARTIST_SELECT)
    .eq("id", artistId)
    .single();

  return Boolean(artist && (artist as { user_id: string }).user_id === userId);
}

/**
 * Authenticate and return user ID, or an error response
 */
async function authenticateUser(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { ok: true, userId: user.id };
}

/**
 * GET /api/before-after?artistId=...
 * Fetch before/after photos for an artist
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await authenticateUser();
  if (!auth.ok) return auth.response;

  const artistId = request.nextUrl.searchParams.get("artistId");
  if (!artistId) {
    return NextResponse.json({ error: "artistId is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (!await verifyOwnership(admin, artistId, auth.userId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data, error } = await admin
    .from("before_after_photos")
    .select("*")
    .eq("artist_id", artistId)
    .order("order_index", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

/**
 * POST /api/before-after
 * Create a new before/after photo entry
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await authenticateUser();
  if (!auth.ok) return auth.response;

  const body = await request.json() as {
    artistId: string;
    title?: string;
    beforeImagePath: string;
    afterImagePath: string;
    orderIndex?: number;
  };

  if (!body.artistId || !body.beforeImagePath || !body.afterImagePath) {
    return NextResponse.json({ error: "artistId, beforeImagePath, and afterImagePath are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (!await verifyOwnership(admin, body.artistId, auth.userId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data, error } = await admin
    .from("before_after_photos")
    .insert({
      artist_id: body.artistId,
      title: body.title ?? null,
      before_image_path: body.beforeImagePath,
      after_image_path: body.afterImagePath,
      order_index: body.orderIndex ?? 0,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: data?.id });
}

/**
 * DELETE /api/before-after
 * Delete a before/after photo entry
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const auth = await authenticateUser();
  if (!auth.ok) return auth.response;

  const body = await request.json() as { artistId: string; photoId: string };
  if (!body.artistId || !body.photoId) {
    return NextResponse.json({ error: "artistId and photoId required" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (!await verifyOwnership(admin, body.artistId, auth.userId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await admin.from("before_after_photos").delete().eq("id", body.photoId);

  return NextResponse.json({ success: true });
}
