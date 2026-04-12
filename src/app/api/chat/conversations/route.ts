import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { earnPointsWithLimit } from "@/lib/supabase/point-queries";

interface ConversationRow {
    id: string;
    participant_1: string;
    participant_2: string;
    last_message: string | null;
    last_message_at: string | null;
    created_at: string;
}

/** GET /api/chat/conversations — list my conversations */
export async function GET(): Promise<NextResponse> {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
        .from("conversations")
        .select("*")
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order("last_message_at", { ascending: false, nullsFirst: false });

    if (!data) return NextResponse.json({ conversations: [] });

    const rows = (data ?? []) as ConversationRow[];

    // Collect other user IDs to fetch profiles
    const otherIds = rows
        .map(c => c.participant_1 === user.id ? c.participant_2 : c.participant_1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("id, nickname, avatar_url")
        .in("id", otherIds);

    // Also check artists table for artist names
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: artists } = await (supabase as any)
        .from("artists")
        .select("user_id, title, profile_image_path")
        .in("user_id", otherIds);

    const profileMap = new Map<string, { nickname: string | null; avatar_url: string | null }>();
    for (const p of (profiles ?? []) as { id: string; nickname: string | null; avatar_url: string | null }[]) {
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
            otherName: artist?.title ?? profile?.nickname ?? "사용자",
            otherAvatar: artist?.profile_image_path ?? profile?.avatar_url ?? null,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
        .from("conversations")
        .select("id")
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${body.otherUserId}),and(participant_1.eq.${body.otherUserId},participant_2.eq.${user.id})`)
        .limit(1)
        .single();

    if (existing) return NextResponse.json({ conversationId: (existing as { id: string }).id });

    // Create new
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newConv, error } = await (supabase as any)
        .from("conversations")
        .insert({ participant_1: user.id, participant_2: body.otherUserId })
        .select("id")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 채팅 상담 시작 포인트 (1회/일)
    void earnPointsWithLimit({ userId: user.id, amount: 2_000, reason: "CHAT_START", description: "채팅 상담 시작" });

    return NextResponse.json({ conversationId: (newConv as { id: string }).id });
}
