"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notifyAllArtists, notifyUser } from "@/lib/supabase/notification-queries";

const SELECT_USER_ID_TITLE = "user_id, title";
const QUOTE_REQUEST_PATH = "/quote-request";

interface CreateQuoteRequestInput {
  title: string;
  description?: string;
  bodyPart: string;
  size?: string;
  style?: string;
  budgetMin?: number;
  budgetMax?: number;
  referenceImages?: string[];
}

export async function createQuoteRequest(input: CreateQuoteRequestInput): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "LOGIN_REQUIRED" };

  const { data, error } = await supabase
    .from("quote_requests")
    .insert({
      user_id: user.id,
      title: input.title,
      description: input.description ?? null,
      body_part: input.bodyPart,
      size: input.size ?? null,
      style: input.style ?? null,
      budget_min: input.budgetMin ?? null,
      budget_max: input.budgetMax ?? null,
      reference_images: input.referenceImages ?? [],
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  // Notify all artists about the new quote request (fire-and-forget)
  notifyAllArtists({
    type: "NEW_QUOTE_REQUEST",
    title: "새 견적 요청이 등록되었습니다",
    body: input.title,
    data: { quoteRequestId: data.id, bodyPart: input.bodyPart },
  }).catch(() => {/* notification failure should not block response */});

  revalidatePath(QUOTE_REQUEST_PATH);
  return { success: true, id: data.id };
}

interface SubmitBidInput {
  quoteRequestId: string;
  price: number;
  description?: string;
  estimatedDuration?: string;
  portfolioId?: string;
}

export async function submitQuoteBid(input: SubmitBidInput): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "LOGIN_REQUIRED" };

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!artist) return { success: false, error: "ARTIST_ONLY" };

  const { data: existing } = await supabase
    .from("quote_bids")
    .select("id")
    .eq("quote_request_id", input.quoteRequestId)
    .eq("artist_id", artist.id)
    .maybeSingle();

  if (existing) return { success: false, error: "ALREADY_BID" };

  const { error } = await supabase
    .from("quote_bids")
    .insert({
      quote_request_id: input.quoteRequestId,
      artist_id: artist.id,
      price: input.price,
      description: input.description ?? null,
      estimated_duration: input.estimatedDuration ?? null,
      portfolio_id: input.portfolioId ?? null,
    });

  if (error) return { success: false, error: error.message };

  // Notify quote requester about new bid (fire-and-forget)
  notifyQuoteRequester(supabase, input.quoteRequestId, artist.id, input.price)
    .catch(() => {/* notification failure should not block response */});

  revalidatePath(`${QUOTE_REQUEST_PATH}/${input.quoteRequestId}`);
  return { success: true };
}

async function notifyQuoteRequester(
  supabase: Awaited<ReturnType<typeof createClient>>,
  quoteRequestId: string,
  artistId: string,
  price: number,
): Promise<void> {
  const { data: request } = await supabase
    .from("quote_requests")
    .select(SELECT_USER_ID_TITLE)
    .eq("id", quoteRequestId)
    .single();

  if (!request) return;

  const { data: artistInfo } = await supabase
    .from("artists")
    .select("title")
    .eq("id", artistId)
    .single();

  await notifyUser(request.user_id, {
    type: "NEW_BID",
    title: "새로운 견적이 도착했습니다",
    body: `${artistInfo?.title ?? "아티스트"}님이 "${request.title}"에 견적을 제출했습니다`,
    data: { quoteRequestId, artistId, price },
  });
}

export async function acceptBid(bidId: string, quoteRequestId: string): Promise<{ success: boolean; conversationId?: string; error?: string }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { success: false, error: "LOGIN_REQUIRED" };

  const supabase = createAdminClient();

  const { data: request } = await supabase
    .from("quote_requests")
    .select(SELECT_USER_ID_TITLE)
    .eq("id", quoteRequestId)
    .single();

  if (!request || request.user_id !== user.id) return { success: false, error: "NOT_OWNER" };

  const { error: bidError } = await supabase
    .from("quote_bids")
    .update({ status: "ACCEPTED" })
    .eq("id", bidId);

  if (bidError) return { success: false, error: bidError.message };

  await supabase
    .from("quote_bids")
    .update({ status: "REJECTED" })
    .eq("quote_request_id", quoteRequestId)
    .neq("id", bidId);

  await supabase
    .from("quote_requests")
    .update({ status: "COMPLETED" })
    .eq("id", quoteRequestId);

  // Create conversation + notify accepted artist (fire-and-forget)
  const conversationId = await createConversationForBid(supabase, user.id, bidId, request.title, quoteRequestId);

  revalidatePath(`${QUOTE_REQUEST_PATH}/${quoteRequestId}`);
  return { success: true, conversationId: conversationId ?? undefined };
}

const CONVERSATIONS_TABLE = "conversations";

async function createConversationForBid(
  supabase: ReturnType<typeof createAdminClient>,
  requesterId: string,
  bidId: string,
  requestTitle: string,
  quoteRequestId: string,
): Promise<string | null> {
  try {
    // Get the artist's user_id from the bid
    const { data: bid } = await supabase
      .from("quote_bids")
      .select("artist_id")
      .eq("id", bidId)
      .single();
    if (!bid) return null;

    const { data: artist } = await supabase
      .from("artists")
      .select(SELECT_USER_ID_TITLE)
      .eq("id", bid.artist_id)
      .single();
    if (!artist) return null;

    const artistUserId = artist.user_id as string;

    // Check if conversation already exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- conversations table not in generated types
    const { data: existing } = await (supabase as any)
      .from(CONVERSATIONS_TABLE)
      .select("id")
      .or(`and(participant_1.eq.${requesterId},participant_2.eq.${artistUserId}),and(participant_1.eq.${artistUserId},participant_2.eq.${requesterId})`)
      .limit(1)
      .maybeSingle();

    let conversationId: string;
    if (existing) {
      conversationId = (existing as { id: string }).id;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- conversations table not in generated types
      const { data: newConv } = await (supabase as any)
        .from(CONVERSATIONS_TABLE)
        .insert({ participant_1: requesterId, participant_2: artistUserId })
        .select("id")
        .single();
      conversationId = (newConv as { id: string }).id;
    }

    // Notify the accepted artist
    await notifyUser(artistUserId, {
      type: "BID_ACCEPTED",
      title: "견적이 선택되었습니다!",
      body: `"${requestTitle}" 견적 요청에서 회원님의 견적이 선택되었습니다. 채팅으로 상세 내용을 협의하세요.`,
      data: { quoteRequestId, bidId },
    });

    return conversationId;
  } catch {
    return null;
  }
}

function inputToRow(input: CreateQuoteRequestInput): Record<string, unknown> {
  return {
    title: input.title,
    description: input.description ?? null,
    body_part: input.bodyPart,
    size: input.size ?? null,
    style: input.style ?? null,
    budget_min: input.budgetMin ?? null,
    budget_max: input.budgetMax ?? null,
    reference_images: input.referenceImages ?? [],
  };
}

export async function updateQuoteRequest(
  requestId: string,
  input: CreateQuoteRequestInput,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "LOGIN_REQUIRED" };

  const { data: request } = await supabase
    .from("quote_requests")
    .select("user_id, status")
    .eq("id", requestId)
    .single();

  if (!request || request.user_id !== user.id) return { success: false, error: "NOT_OWNER" };
  if (request.status !== "OPEN") return { success: false, error: "NOT_EDITABLE" };

  const { error } = await supabase
    .from("quote_requests")
    .update(inputToRow(input))
    .eq("id", requestId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`${QUOTE_REQUEST_PATH}/${requestId}`);
  revalidatePath(QUOTE_REQUEST_PATH);
  return { success: true };
}

export async function cancelQuoteRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "LOGIN_REQUIRED" };

  const { error } = await supabase
    .from("quote_requests")
    .update({ status: "CANCELLED", deleted_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath(QUOTE_REQUEST_PATH);
  return { success: true };
}
