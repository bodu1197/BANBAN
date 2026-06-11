import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { createAdminClient } from "@/lib/supabase/server";

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

async function getPendingArtistCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("artists")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .is("deleted_at", null) as CountResult;
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

async function getConversationCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("chat_rooms")
    .select("id", { count: "exact", head: true }) as CountResult;
  return count ?? 0;
}

async function getPendingReportCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "PENDING") as CountResult;
  return count ?? 0;
}

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const [pendingShops, inquiries, exhibitions, members, dormant, chats, reports] = await Promise.all([
    getPendingArtistCount(),
    getInquiryCount(),
    getExhibitionPendingCount(),
    getNewMemberCount(),
    getDormantArtistCount(),
    getConversationCount(),
    getPendingReportCount(),
  ]);

  return NextResponse.json({
    counts: {
      "/admin/artist-approvals": pendingShops,
      "/admin/inquiries": inquiries,
      "/admin/exhibitions": exhibitions,
      "/admin/members": members,
      "/admin/dormant-artists": dormant,
      "/admin/chats": chats,
      "/admin/reports": reports,
    },
  });
}
