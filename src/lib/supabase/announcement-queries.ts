import type { Json } from "@/types/database";
import { createAdminClient } from "./server";

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  is_active: boolean;
  created_at: string;
}

const ANNOUNCEMENT_COLUMNS = "id, title, body, is_active, created_at";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- announcements table not in generated types
function announcementsTable(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
  return (createAdminClient() as any).from("announcements");
}

export async function fetchActiveAnnouncements(limit = 5): Promise<AnnouncementRow[]> {
  const { data } = await announcementsTable()
    .select(ANNOUNCEMENT_COLUMNS)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as AnnouncementRow[];
}

export async function fetchAllAnnouncements(limit = 50): Promise<AnnouncementRow[]> {
  const { data } = await announcementsTable()
    .select(ANNOUNCEMENT_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as AnnouncementRow[];
}

export async function createAnnouncement(
  title: string,
  body: string,
): Promise<AnnouncementRow | null> {
  const { data } = await announcementsTable()
    .insert({ title, body })
    .select(ANNOUNCEMENT_COLUMNS)
    .single();

  return (data as AnnouncementRow) ?? null;
}

export async function toggleAnnouncementActive(
  id: string,
  isActive: boolean,
): Promise<boolean> {
  const { error } = await announcementsTable()
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  return !error;
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  const { error } = await announcementsTable()
    .delete()
    .eq("id", id);

  return !error;
}

/**
 * Send announcement notification to ALL users (not just artists).
 */
export async function notifyAllUsers(notification: {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createAdminClient();

  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select("id");

  if (usersError || !users?.length) return;

  const rows = users.map((u) => ({
    user_id: u.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    data: (notification.data ?? null) as Json,
  }));

  // Batch insert in chunks of 500 to avoid payload limits
  const CHUNK_SIZE = 500;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from("notifications").insert(chunk);
    if (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to insert announcement notifications (batch ${i}): ${error.message}`);
    }
  }
}
