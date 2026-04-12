import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

/** GET /api/chat/unread-count — returns number of unread messages for current user */
export async function GET(): Promise<NextResponse> {
  const user = await getUser();
  if (!user) return NextResponse.json({ count: 0 });

  const supabase = await createClient();

  // Find all conversations where user is a participant
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: conversations } = await (supabase as any)
    .from("conversations")
    .select("id")
    .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`);

  if (!conversations || conversations.length === 0) {
    return NextResponse.json({ count: 0 });
  }

  const convIds = (conversations as Array<{ id: string }>).map((c) => c.id);

  // Count unread messages (sent by others, not yet read)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as any)
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", convIds)
    .neq("sender_id", user.id)
    .is("read_at", null);

  return NextResponse.json({ count: count ?? 0 });
}
