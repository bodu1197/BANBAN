import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { notifyChatRecipient } from "@/lib/supabase/chat-notification";

/** GET /api/chat/messages?conversationId=xxx&limit=50&before=timestamp */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");
    if (!conversationId) return NextResponse.json({ error: "missing_conversation_id" }, { status: 400 });

    const limit = Number(searchParams.get("limit") ?? "50");
    const before = searchParams.get("before");

    const supabase = await createClient();

    // Verify user is participant
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: conv } = await (supabase as any)
        .from("conversations")
        .select("id")
        .eq("id", conversationId)
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .single();

    if (!conv) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
        .from("messages")
        .select("id, sender_id, content, media_url, created_at, read_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (before) {
        query = query.lt("created_at", before);
    }

    const { data: messages } = await query;

    // Mark unread messages as read
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .neq("sender_id", user.id)
        .is("read_at", null);

    return NextResponse.json({ messages: (messages ?? []).reverse() });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function verifyConversationParticipant(supabase: any, conversationId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
        .from("conversations")
        .select("id")
        .eq("id", conversationId)
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
        .single();
    return !!data;
}

function getSenderName(user: { user_metadata?: Record<string, unknown> }): string {
    return (user.user_metadata?.nickname ?? user.user_metadata?.name ?? "사용자") as string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function insertMessageAndUpdate(supabase: any, conversationId: string, senderId: string, content: string, mediaUrl?: string | null): Promise<{ msg: unknown; error: string | null }> {
    const row: Record<string, unknown> = { conversation_id: conversationId, sender_id: senderId, content };
    if (mediaUrl) row.media_url = mediaUrl;
    const { data: msg, error } = await supabase
        .from("messages")
        .insert(row)
        .select("id, sender_id, content, media_url, created_at")
        .single();
    if (error) return { msg: null, error: error.message };

    await supabase
        .from("conversations")
        .update({ last_message: content.slice(0, 100), last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

    return { msg, error: null };
}

interface SendMessageBody { conversationId: string; content: string; mediaUrl?: string }

function getNotifyText(content: string, mediaUrl: string | null): string {
    return mediaUrl && !content ? "📎 파일을 보냈습니다" : content;
}

async function handleSendMessage(user: { id: string; user_metadata?: Record<string, unknown> }, body: SendMessageBody): Promise<NextResponse> {
    const supabase = await createClient();
    const isParticipant = await verifyConversationParticipant(supabase, body.conversationId, user.id);
    if (!isParticipant) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const content = body.content?.trim() ?? "";
    const mediaUrl = body.mediaUrl ?? null;
    const { msg, error } = await insertMessageAndUpdate(supabase, body.conversationId, user.id, content, mediaUrl);
    if (error) return NextResponse.json({ error }, { status: 500 });

    notifyChatRecipient(supabase, body.conversationId, user.id, getSenderName(user), getNotifyText(content, mediaUrl)).catch(() => { /* non-critical */ });
    return NextResponse.json({ message: msg });
}

/** POST /api/chat/messages — send a message */
export async function POST(request: NextRequest): Promise<NextResponse> {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await request.json() as SendMessageBody;
    const hasContent = body.content?.trim() || body.mediaUrl;
    if (!body.conversationId || !hasContent) return NextResponse.json({ error: "missing_params" }, { status: 400 });

    return handleSendMessage(user, body);
}
