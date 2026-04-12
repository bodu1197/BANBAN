import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";

type ProfileRow = { id: string; username: string; nickname: string | null };

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

type BidRow = { id: string; quote_request_id: string; artist_id: string; price: number; description: string | null; estimated_duration: string | null; status: string; created_at: string };
type ArtistRow = { id: string; title: string; user_id: string };
type BidDetail = { artistName: string; artistUserId: string; price: number; description: string | null; estimatedDuration: string | null; status: string; createdAt: string };

function toBidDetail(b: BidRow, artistMap: Map<string, ArtistRow>): BidDetail {
  const artist = artistMap.get(b.artist_id);
  return {
    artistName: artist?.title ?? "알 수 없음",
    artistUserId: artist?.user_id ?? "",
    price: b.price,
    description: b.description,
    estimatedDuration: b.estimated_duration,
    status: b.status,
    createdAt: b.created_at,
  };
}

function groupBidsByQuote(bidRows: BidRow[], artistMap: Map<string, ArtistRow>): Map<string, BidDetail[]> {
  const map = new Map<string, BidDetail[]>();
  for (const b of bidRows) {
    const arr = map.get(b.quote_request_id) ?? [];
    arr.push(toBidDetail(b, artistMap));
    map.set(b.quote_request_id, arr);
  }
  return map;
}

async function buildBidDetails(quoteIds: string[]): Promise<Map<string, BidDetail[]>> {
  if (quoteIds.length === 0) return new Map();
  const supabase = createAdminClient();

  const { data: bids } = await supabase
    .from("quote_bids")
    .select("id, quote_request_id, artist_id, price, description, estimated_duration, status, created_at")
    .in("quote_request_id", quoteIds)
    .order("created_at", { ascending: true });

  const bidRows = (bids ?? []) as BidRow[];
  const artistIds = [...new Set(bidRows.map((b) => b.artist_id))];

  const { data: artists } = artistIds.length > 0
    ? await supabase.from("artists").select("id, title, user_id").in("id", artistIds)
    : { data: [] };

  const artistMap = new Map((artists ?? []).map((a: ArtistRow) => [a.id, a]));
  return groupBidsByQuote(bidRows, artistMap);
}

type ConvMessage = { senderName: string; content: string; createdAt: string };

async function findConversationMessages(userId: string, artistUserId: string): Promise<ConvMessage[]> {
  if (!userId || !artistUserId) return [];
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- conversations table not in generated types
  const { data: conv } = await (supabase as any)
    .from("conversations")
    .select("id")
    .or(`and(participant_1.eq.${userId},participant_2.eq.${artistUserId}),and(participant_1.eq.${artistUserId},participant_2.eq.${userId})`)
    .limit(1)
    .maybeSingle();

  if (!conv) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- messages table not in generated types
  const { data: msgs } = await (supabase as any)
    .from("messages")
    .select("id, sender_id, content, created_at")
    .eq("conversation_id", (conv as { id: string }).id)
    .order("created_at", { ascending: true })
    .limit(50);

  if (!msgs || (msgs as ConvMessage[]).length === 0) return [];

  const senderIds = [...new Set((msgs as Array<{ sender_id: string }>).map((m) => m.sender_id))];
  const profileMap = await buildProfileMap(senderIds);

  return (msgs as Array<{ sender_id: string; content: string; created_at: string }>).map((m) => {
    const p = profileMap.get(m.sender_id);
    return { senderName: p ? (p.nickname ?? p.username) : "알 수 없음", content: m.content, createdAt: m.created_at };
  });
}

type QuoteRow = { id: string; user_id: string; title: string; description: string | null; body_part: string; size: string | null; style: string | null; budget_min: number | null; budget_max: number | null; reference_images: string[] | null; status: string; created_at: string };

async function fetchQuotes(page: number, search: string): Promise<NextResponse> {
  const supabase = createAdminClient();
  const limit = 20;
  const offset = (page - 1) * limit;

  const { data: hiddenRows } = await supabase
    .from("admin_hidden_items")
    .select("item_id")
    .eq("table_name", "quote_requests");
  const hiddenIds = (hiddenRows ?? []).map((r: { item_id: string }) => r.item_id);

  let query = supabase
    .from("quote_requests")
    .select("id, user_id, title, description, body_part, size, style, budget_min, budget_max, reference_images, status, created_at", { count: "exact" });

  for (const hid of hiddenIds) {
    query = query.neq("id", hid);
  }

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as QuoteRow[];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const quoteIds = rows.map((r) => r.id);

  const [profileMap, bidDetailsMap] = await Promise.all([
    buildProfileMap(userIds),
    buildBidDetails(quoteIds),
  ]);

  // For completed quotes, find conversation messages
  const convPromises = rows.map(async (r) => {
    if (r.status !== "COMPLETED") return [];
    const bids = bidDetailsMap.get(r.id) ?? [];
    const accepted = bids.find((b) => b.status === "ACCEPTED");
    if (!accepted) return [];
    return findConversationMessages(r.user_id, accepted.artistUserId);
  });
  const convResults = await Promise.all(convPromises);

  const quotes = rows.map((r, idx) => {
    const profile = profileMap.get(r.user_id);
    const bids = bidDetailsMap.get(r.id) ?? [];
    return {
      ...r,
      userName: profile ? (profile.nickname ?? profile.username) : "알 수 없음",
      bidCount: bids.length,
      bids,
      conversationMessages: convResults.at(idx) ?? [],
    };
  });

  return NextResponse.json({ quotes, total: count ?? 0, page, limit });
}

/** GET — 전체 견적 요청 목록 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const search = url.searchParams.get("search") ?? "";
  return fetchQuotes(page, search);
}

/** DELETE — 관리자 뷰에서 숨김 처리 (실제 삭제 아님) */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json() as { id: string };
  if (!body.id) return NextResponse.json({ error: "ID 누락" }, { status: 400 });

  const supabase = createAdminClient();
  await supabase.from("admin_hidden_items").upsert({
    table_name: "quote_requests",
    item_id: body.id,
  });

  return NextResponse.json({ success: true });
}
