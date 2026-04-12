import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchUserNotifications,
  countUnreadNotifications,
  markAllNotificationsRead,
} from "@/lib/supabase/notification-queries";

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [notifications, unreadCount] = await Promise.all([
    fetchUserNotifications(user.id),
    countUnreadNotifications(user.id),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await markAllNotificationsRead(user.id);
  return NextResponse.json({ success: true });
}
