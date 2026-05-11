import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const ARTIST_SELECT = "id, user_id" as const;

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const artistId = request.nextUrl.searchParams.get("artistId");
  if (!artistId) {
    return NextResponse.json(
      { error: "artistId is required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  if (!(await verifyOwnership(admin, artistId, user.id))) {
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
