import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";
import {
  fetchAllAnnouncements,
  createAnnouncement,
  toggleAnnouncementActive,
  deleteAnnouncement,
  notifyAllUsers,
} from "@/lib/supabase/announcement-queries";
import { sendBroadcastPush } from "@/lib/swing2app-push";

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();
  return !!(data as { is_admin: boolean } | null)?.is_admin;
}

/** GET /api/admin/announcements */
export async function GET(): Promise<NextResponse> {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = await isAdmin(user.id);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const announcements = await fetchAllAnnouncements();
  return NextResponse.json({ announcements });
}

/** POST /api/admin/announcements — create + notify all */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = await isAdmin(user.id);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json() as { title: string; body: string };
  if (!body.title?.trim() || !body.body?.trim()) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  const announcement = await createAnnouncement(body.title.trim(), body.body.trim());
  if (!announcement) return NextResponse.json({ error: "create_failed" }, { status: 500 });

  // Send notification to all users (fire-and-forget)
  notifyAllUsers({
    type: "ANNOUNCEMENT",
    title: `📢 ${announcement.title}`,
    body: announcement.body.slice(0, 100),
    data: { announcementId: announcement.id },
  }).catch(() => { /* non-critical */ });

  // Swing2App 전체 브로드캐스트 푸시
  sendBroadcastPush(
    `📢 ${announcement.title}`,
    announcement.body.slice(0, 100),
    "https://howtattoo.com/mypage",
  ).catch(() => { /* non-critical */ });

  return NextResponse.json({ announcement });
}

/** PATCH /api/admin/announcements — toggle active */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = await isAdmin(user.id);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json() as { id: string; is_active: boolean };
  const ok = await toggleAnnouncementActive(body.id, body.is_active);
  if (!ok) return NextResponse.json({ error: "update_failed" }, { status: 500 });

  return NextResponse.json({ success: true });
}

/** DELETE /api/admin/announcements */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = await isAdmin(user.id);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json() as { id: string };
  const ok = await deleteAnnouncement(body.id);
  if (!ok) return NextResponse.json({ error: "delete_failed" }, { status: 500 });

  return NextResponse.json({ success: true });
}
