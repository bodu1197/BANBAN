import type { Json } from "@/types/database";
import { createAdminClient } from "./server";
import { sendPush } from "@/lib/swing2app-push";

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export async function fetchUserNotifications(
  userId: string,
  limit = 20,
): Promise<NotificationRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, data, is_read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to fetch notifications: ${error.message}`);
    return [];
  }
  return (data ?? []) as NotificationRow[];
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) return 0;
  return count ?? 0;
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId);

  return !error;
}

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_read", false);

  return !error;
}

/**
 * Notify a single user (e.g. quote requester when an artist bids).
 * Uses service role to bypass RLS.
 */
export async function notifyUser(
  userId: string,
  notification: {
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  },
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: (notification.data ?? null) as Json,
    });

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to insert notification: ${error.message}`);
  }

  // Swing2App 푸시 발송 (fire-and-forget)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://howtattoo.com";
  sendPush({
    targetUserIds: userId,
    title: notification.title,
    content: notification.body,
    linkUrl: `${siteUrl}/mypage`,
  }).catch(() => { /* non-fatal */ });
}

/**
 * Notify all artists about a new quote request.
 * Uses service role to bypass RLS and batch insert.
 */
export async function notifyAllArtists(notification: {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createAdminClient();

  const { data: artists, error: artistError } = await supabase
    .from("artists")
    .select("user_id")
    .is("deleted_at", null);

  if (artistError || !artists?.length) return;

  const rows = artists.map((a) => ({
    user_id: a.user_id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    data: (notification.data ?? null) as Json,
  }));

  const { error } = await supabase
    .from("notifications")
    .insert(rows);

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to insert notifications: ${error.message}`);
  }

  // Swing2App 푸시: 아티스트 개별 발송 (최대 100명씩)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://howtattoo.com";
  const ids = artists.map((a) => a.user_id);
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    sendPush({
      targetUserIds: chunk,
      title: notification.title,
      content: notification.body,
      linkUrl: `${siteUrl}/quote-request`,
    }).catch(() => { /* non-fatal */ });
  }
}
