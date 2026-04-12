import { notifyUser } from "./notification-queries";

/**
 * Send a chat message notification to the other conversation participant.
 * Extracted to reduce complexity of the messages API route.
 */
export async function notifyChatRecipient(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  conversationId: string,
  senderId: string,
  senderName: string,
  content: string,
): Promise<void> {
  const { data } = await supabase
    .from("conversations")
    .select("participant_1, participant_2")
    .eq("id", conversationId)
    .single();

  if (!data) return;

  const conv = data as { participant_1: string; participant_2: string };
  const recipientId = conv.participant_1 === senderId ? conv.participant_2 : conv.participant_1;

  await notifyUser(recipientId, {
    type: "NEW_CHAT_MESSAGE",
    title: `${senderName}님의 새 메시지`,
    body: content.slice(0, 100),
    data: { conversationId, senderId },
  });
}
