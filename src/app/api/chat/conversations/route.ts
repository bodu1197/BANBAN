import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { earnPointsWithLimit } from "@/lib/supabase/point-queries";
import { getAvatarUrl } from "@/lib/supabase/storage-utils";

interface ConversationRow {
    id: string;
    participant_1: string;
    participant_2: string;
    last_message: string | null;
    last_message_at: string | null;
    created_at: string;
}

type OtherProfile = { nickname: string | null; profile_image_path: string | null } | undefined;
type OtherArtist = { title: string; profile_image_path: string | null } | undefined;

/** 상대 표시 이름 — 아티스트 상호 > 닉네임 > 기본값. */
function resolveOtherName(artist: OtherArtist, profile: OtherProfile): string {
    return artist?.title ?? profile?.nickname ?? "사용자";
}

/** 상대 아바타 URL — 아티스트 대표사진(스토리지 경로→public URL) > 프로필 이미지 > null. */
function resolveOtherAvatar(artist: OtherArtist, profile: OtherProfile): string | null {
    return getAvatarUrl(artist?.profile_image_path ?? null) ?? getAvatarUrl(profile?.profile_image_path ?? null) ?? null;
}

/** GET /api/chat/conversations — list my conversations */
export async function GET(): Promise<NextResponse> {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const supabase = await createClient();
    const { data } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order("last_message_at", { ascending: false, nullsFirst: false });

    if (!data) return NextResponse.json({ conversations: [] });

    const rows = (data ?? []) as ConversationRow[];

    // Collect other user IDs to fetch profiles
    const otherIds = rows
        .map(c => c.participant_1 === user.id ? c.participant_2 : c.participant_1);

    const [{ data: profiles }, { data: artists }] = await Promise.all([
        supabase
            .from("profiles")
            .select("id, nickname, profile_image_path")
            .in("id", otherIds),
        supabase
            .from("artists")
            .select("user_id, title, profile_image_path")
            .in("user_id", otherIds),
    ]);

    const profileMap = new Map<string, { nickname: string | null; profile_image_path: string | null }>();
    for (const p of (profiles ?? []) as { id: string; nickname: string | null; profile_image_path: string | null }[]) {
        profileMap.set(p.id, p);
    }
    const artistMap = new Map<string, { title: string; profile_image_path: string | null }>();
    for (const a of (artists ?? []) as { user_id: string; title: string; profile_image_path: string | null }[]) {
        artistMap.set(a.user_id, a);
    }

    const conversations = rows.map(c => {
        const otherId = c.participant_1 === user.id ? c.participant_2 : c.participant_1;
        const profile = profileMap.get(otherId);
        const artist = artistMap.get(otherId);
        return {
            id: c.id,
            otherId,
            otherName: resolveOtherName(artist, profile),
            otherAvatar: resolveOtherAvatar(artist, profile),
            lastMessage: c.last_message,
            lastMessageAt: c.last_message_at,
            createdAt: c.created_at,
        };
    });

    return NextResponse.json({ conversations });
}

/** POST /api/chat/conversations — start or get existing conversation */
export async function POST(request: NextRequest): Promise<NextResponse> {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await request.json() as { otherUserId: string };
    if (!body.otherUserId) return NextResponse.json({ error: "missing_other_user_id" }, { status: 400 });
    if (body.otherUserId === user.id) return NextResponse.json({ error: "cannot_message_self" }, { status: 400 });

    const supabase = await createClient();

    // Check if conversation already exists (either direction)
    const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${body.otherUserId}),and(participant_1.eq.${body.otherUserId},participant_2.eq.${user.id})`)
        .limit(1)
        .single();

    if (existing) return NextResponse.json({ conversationId: (existing as { id: string }).id });

    // Create new
    const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({ participant_1: user.id, participant_2: body.otherUserId })
        .select("id")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 채팅 상담 시작 포인트 (1회/일)
    void earnPointsWithLimit({ userId: user.id, amount: 2_000, reason: "CHAT_START", description: "채팅 상담 시작" })
      .catch(() => { /* best-effort 적립 — 실패해도 채팅 시작 자체는 성공 처리 */ });

    return NextResponse.json({ conversationId: (newConv as { id: string }).id });
}
