"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";

export interface BlockResult {
  success: boolean;
  error?: string;
}

export async function blockUser(blockedId: string): Promise<BlockResult> {
  const user = await getUser();
  if (!user) return { success: false, error: "unauthorized" };
  if (user.id === blockedId) return { success: false, error: "cannot block yourself" };

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("user_blocks")
    .select("id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", blockedId)
    .maybeSingle();

  if (existing) return { success: true };

  const { error } = await supabase.from("user_blocks").insert({
    blocker_id: user.id,
    blocked_id: blockedId,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/mypage/blocked-users");
  return { success: true };
}

export async function unblockUser(blockedId: string): Promise<BlockResult> {
  const user = await getUser();
  if (!user) return { success: false, error: "unauthorized" };

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", blockedId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/mypage/blocked-users");
  return { success: true };
}

export interface BlockedUser {
  id: string;
  blockedId: string;
  nickname: string;
  profileImage: string | null;
  createdAt: string;
}

export async function getBlockedUsers(): Promise<BlockedUser[]> {
  const user = await getUser();
  if (!user) return [];

  const supabase = createAdminClient();

  const { data: blocks } = await supabase
    .from("user_blocks")
    .select("id, blocked_id, created_at")
    .eq("blocker_id", user.id)
    .order("created_at", { ascending: false });

  if (!blocks || blocks.length === 0) return [];

  const blockedIds = blocks.map((b) => (b as { blocked_id: string }).blocked_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nickname")
    .in("id", blockedIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => {
      const profile = p as { id: string; nickname: string };
      return [profile.id, profile];
    }),
  );

  return blocks.map((b) => {
    const block = b as { id: string; blocked_id: string; created_at: string };
    const profile = profileMap.get(block.blocked_id);
    return {
      id: block.id,
      blockedId: block.blocked_id,
      nickname: profile?.nickname ?? "알 수 없음",
      profileImage: null,
      createdAt: block.created_at,
    };
  });
}

export async function isUserBlocked(blockedId: string): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("user_blocks")
    .select("id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", blockedId)
    .maybeSingle();

  return !!data;
}
