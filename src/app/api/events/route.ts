import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { createEvent, insertEventMedia, insertEventCategories } from "@/lib/supabase/event-queries";
import type { Database } from "@/types/database";

type EventInsert = Database["public"]["Tables"]["events"]["Insert"];

async function getArtistIdForUser(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  return data?.id ?? null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const artistId = await getArtistIdForUser(user.id);
    if (!artistId) {
      return NextResponse.json({ error: "아티스트 계정이 필요합니다" }, { status: 403 });
    }

    const body = await request.json() as {
      event: Omit<EventInsert, "artist_id">;
      media: Array<{ storage_path: string; media_type: string; order_index: number; alt_text?: string | null }>;
      categoryIds?: string[];
    };

    const payload: EventInsert = { ...body.event, artist_id: artistId };
    const id = await createEvent(payload);

    if (body.media?.length) {
      await insertEventMedia(id, body.media);
    }

    if (body.categoryIds?.length) {
      await insertEventCategories(id, body.categoryIds);
    }

    return NextResponse.json({ id });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "이벤트 생성 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
