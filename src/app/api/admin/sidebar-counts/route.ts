import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();
  return !!(data as { is_admin: boolean } | null)?.is_admin;
}

interface CountResult {
  count: number | null;
}

async function getInquiryCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("inquiries")
    .select("id", { count: "exact", head: true })
    .eq("status", "OPEN") as CountResult;
  return count ?? 0;
}

async function getExhibitionPendingCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("exhibition_entries")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending") as CountResult;
  return count ?? 0;
}

async function getNewMemberCount(): Promise<number> {
  const supabase = createAdminClient();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gte("created_at", oneDayAgo) as CountResult;
  return count ?? 0;
}

async function getDormantArtistCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("artists")
    .select("id", { count: "exact", head: true })
    .eq("is_dormant", true) as CountResult;
  return count ?? 0;
}

async function getOpenQuoteCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("quote_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "open") as CountResult;
  return count ?? 0;
}

async function getConversationCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("chat_rooms")
    .select("id", { count: "exact", head: true }) as CountResult;
  return count ?? 0;
}

export async function GET(): Promise<NextResponse> {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const [inquiries, exhibitions, members, dormant, quotes, chats] = await Promise.all([
    getInquiryCount(),
    getExhibitionPendingCount(),
    getNewMemberCount(),
    getDormantArtistCount(),
    getOpenQuoteCount(),
    getConversationCount(),
  ]);

  return NextResponse.json({
    counts: {
      "/admin/inquiries": inquiries,
      "/admin/exhibitions": exhibitions,
      "/admin/members": members,
      "/admin/dormant-artists": dormant,
      "/admin/quotes": quotes,
      "/admin/chats": chats,
    },
  });
}
