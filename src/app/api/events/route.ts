import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { createEvent, insertEventMedia, insertEventCategories } from "@/lib/supabase/event-queries";
import { notifySearchEngines } from "@/lib/utils/search-notify";
import type { Database } from "@/types/database";

type EventInsert = Database["public"]["Tables"]["events"]["Insert"];

async function getArtistForUser(userId: string): Promise<{ id: string; status: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artists")
    .select("id, status")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  return (data as { id: string; status: string } | null) ?? null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const artist = await getArtistForUser(user.id);
    if (!artist) {
      return NextResponse.json({ error: "아티스트 계정이 필요합니다" }, { status: 403 });
    }
    // 미승인(pending/rejected) 샵은 이벤트 발행 불가 — 공개 이벤트 목록 누출 차단(생성 시점 봉쇄).
    if (artist.status !== "active") {
      return NextResponse.json({ error: "샵 승인 후 이벤트를 등록할 수 있습니다" }, { status: 403 });
    }
    const artistId = artist.id;

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

    revalidateTag("events", { expire: 0 });
    revalidatePath("/");
    revalidatePath("/events");
    notifySearchEngines([`/events/${id}`, "/events"]);

    return NextResponse.json({ id });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "이벤트 생성 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
