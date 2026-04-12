import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";

type ProfileRow = { id: string; username: string; nickname: string | null };
type ConversationRow = { id: string; participant_1: string; participant_2: string; last_message: string | null; last_message_at: string | null; created_at: string };

async function requireAdmin(): Promise<string | null> {
  const user = await getUser();
  if (!user) return null;
  const supabase = createAdminClient();
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  return (data as { is_admin: boolean } | null)?.is_admin ? user.id : null;
}

async function buildProfileMap(ids: string[]): Promise<Map<string, ProfileRow>> {
  if (ids.length === 0) return new Map();
  const supabase = createAdminClient();
  const { data } = await supabase.from("profiles").select("id, username, nickname").in("id", ids);
  return new Map((data ?? []).map((p: ProfileRow) => [p.id, p]));
}

function getProfileName(profileMap: Map<string, ProfileRow>, uid: string | null): string {
  if (!uid) return "알 수 없음";
  const p = profileMap.get(uid);
  return p ? (p.nickname ?? p.username) : "알 수 없음";
}

async function fetchMessages(conversationId: string): Promise<NextResponse> {
  const supabase = createAdminClient();
  const { data: msgs } = await supabase
    .from("messages")
    .select("id, sender_id, content, media_url, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);

  const senderIds = [...new Set((msgs ?? []).map((m) => m.sender_id).filter(Boolean) as string[])];
  const profileMap = await buildProfileMap(senderIds);

  const messages = (msgs ?? []).map((m) => ({
    id: m.id,
    sender_id: m.sender_id ?? "",
    content: m.content ?? "",
    media_url: m.media_url,
    created_at: m.created_at,
    senderName: getProfileName(profileMap, m.sender_id),
  }));

  return NextResponse.json({ messages });
}

function resolveParticipants(r: ConversationRow, artistByUserId: Map<string, string>): { customerUid: string; artistUid: string } {
  if (artistByUserId.has(r.participant_2)) return { customerUid: r.participant_1, artistUid: r.participant_2 };
  if (artistByUserId.has(r.participant_1)) return { customerUid: r.participant_2, artistUid: r.participant_1 };
  return { customerUid: r.participant_1, artistUid: r.participant_2 };
}

function mapConversationRow(
  r: ConversationRow, profileMap: Map<string, ProfileRow>, artistByUserId: Map<string, string>,
): { id: string; userName: string; artistName: string; status: string; lastMessage: string | null; lastMessageAt: string | null; createdAt: string } {
  const { customerUid, artistUid } = resolveParticipants(r, artistByUserId);
  return {
    id: r.id,
    userName: getProfileName(profileMap, customerUid),
    artistName: artistByUserId.get(artistUid) ?? getProfileName(profileMap, artistUid),
    status: "ACTIVE",
    lastMessage: r.last_message,
    lastMessageAt: r.last_message_at,
    createdAt: r.created_at,
  };
}

async function fetchConversations(page: number, search: string): Promise<NextResponse> {
  const supabase = createAdminClient();
  const limit = 20;
  const offset = (page - 1) * limit;

  const { data: hiddenRows } = await supabase
    .from("admin_hidden_items")
    .select("item_id")
    .eq("table_name", "conversations");
  const hiddenIds = (hiddenRows ?? []).map((r: { item_id: string }) => r.item_id);

  let query = supabase
    .from("conversations")
    .select("id, participant_1, participant_2, last_message, last_message_at, created_at", { count: "exact" });

  for (const hid of hiddenIds) {
    query = query.neq("id", hid);
  }

  const { data, count, error } = await query
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as ConversationRow[];
  const allUserIds = [...new Set(rows.flatMap((r) => [r.participant_1, r.participant_2]))];
  const [profileMap, { data: artistRows }] = await Promise.all([
    buildProfileMap(allUserIds),
    supabase.from("artists").select("user_id, title").in("user_id", allUserIds),
  ]);
  const artistByUserId = new Map((artistRows ?? []).map((a: { user_id: string; title: string }) => [a.user_id, a.title]));

  let conversations = rows.map((r) => mapConversationRow(r, profileMap, artistByUserId));

  if (search) {
    const q = search.toLowerCase();
    conversations = conversations.filter((c) =>
      c.userName.toLowerCase().includes(q) ||
      c.artistName.toLowerCase().includes(q) ||
      (c.lastMessage ?? "").toLowerCase().includes(q),
    );
  }

  return NextResponse.json({ conversations, total: count ?? 0, page, limit });
}

/** GET — 채팅 목록 + 메시지 조회 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversationId");
  if (conversationId) return fetchMessages(conversationId);

  const page = Number(url.searchParams.get("page") ?? "1");
  const search = url.searchParams.get("search") ?? "";
  return fetchConversations(page, search);
}

/** DELETE — 관리자 뷰에서 숨김 처리 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json() as { id: string };
  if (!body.id) return NextResponse.json({ error: "ID 누락" }, { status: 400 });

  const supabase = createAdminClient();
  await supabase.from("admin_hidden_items").upsert({
    table_name: "conversations",
    item_id: body.id,
  });

  return NextResponse.json({ success: true });
}
