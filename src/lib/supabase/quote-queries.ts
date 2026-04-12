import { createClient, createStaticClient } from "./server";
import { getAvatarUrl } from "./storage-utils";

export interface QuoteRequestSummary {
  id: string;
  title: string;
  bodyPart: string;
  size: string | null;
  style: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  status: string;
  createdAt: string;
  bidCount: number;
  userName: string | null;
}

export interface QuoteRequestDetail {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  bodyPart: string;
  size: string | null;
  style: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  referenceImages: string[] | null;
  status: string;
  closedAt: string | null;
  createdAt: string;
  userName: string | null;
  bids: QuoteBidItem[];
}

export interface QuoteBidItem {
  id: string;
  artistId: string;
  artistUserId: string;
  artistName: string;
  artistProfileImage: string | null;
  price: number;
  description: string | null;
  estimatedDuration: string | null;
  portfolioId: string | null;
  status: string;
  createdAt: string;
}

export async function fetchQuoteRequests(limit = 20): Promise<QuoteRequestSummary[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("quote_requests")
    .select("id, title, body_part, size, style, budget_min, budget_max, status, created_at, user_id")
    .eq("status", "OPEN")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    // eslint-disable-next-line no-console -- server-side error logging
    console.error("Failed to fetch quote requests:", error.message);
    return [];
  }

  const userIds = [...new Set((data ?? []).map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nickname")
    .in("id", userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.nickname]));

  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    bodyPart: r.body_part,
    size: r.size,
    style: r.style,
    budgetMin: r.budget_min,
    budgetMax: r.budget_max,
    status: r.status,
    createdAt: r.created_at,
    bidCount: 0,
    userName: profileMap.get(r.user_id) ?? null,
  }));
}

type ArtistInfo = { id: string; user_id: string; title: string; profile_image_path: string | null };

function mapBidRow(b: { id: string; artist_id: string; price: number; description: string | null; estimated_duration: string | null; portfolio_id: string | null; status: string; created_at: string }, artistMap: Map<string, ArtistInfo>): QuoteBidItem {
  const artist = artistMap.get(b.artist_id);
  return {
    id: b.id, artistId: b.artist_id,
    artistUserId: artist?.user_id ?? "",
    artistName: artist?.title ?? "Unknown",
    artistProfileImage: getAvatarUrl(artist?.profile_image_path ?? null),
    price: b.price, description: b.description,
    estimatedDuration: b.estimated_duration, portfolioId: b.portfolio_id,
    status: b.status, createdAt: b.created_at,
  };
}

export async function fetchQuoteRequestDetail(id: string): Promise<QuoteRequestDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quote_requests").select("*").eq("id", id).single();

  if (error || !data) return null;

  const [profileRes, bidsRes] = await Promise.all([
    supabase.from("profiles").select("nickname").eq("id", data.user_id).single(),
    supabase.from("quote_bids")
      .select("id, artist_id, price, description, estimated_duration, portfolio_id, status, created_at")
      .eq("quote_request_id", id).order("created_at", { ascending: true }),
  ]);

  const bidRows = bidsRes.data ?? [];
  const artistIds = [...new Set(bidRows.map((b) => b.artist_id))];
  const { data: artists } = await supabase.from("artists").select("id, user_id, title, profile_image_path").in("id", artistIds);
  const artistMap = new Map((artists ?? []).map((a) => [a.id, a]));

  return {
    id: data.id, userId: data.user_id, title: data.title,
    description: data.description, bodyPart: data.body_part,
    size: data.size, style: data.style,
    budgetMin: data.budget_min, budgetMax: data.budget_max,
    referenceImages: data.reference_images, status: data.status,
    closedAt: data.closed_at, createdAt: data.created_at,
    userName: profileRes.data?.nickname ?? null,
    bids: bidRows.map((b) => mapBidRow(b, artistMap)),
  };
}

export async function fetchMyQuoteRequests(userId: string): Promise<QuoteRequestSummary[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("quote_requests")
    .select("id, title, body_part, size, style, budget_min, budget_max, status, created_at, user_id")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    // eslint-disable-next-line no-console -- server-side error logging
    console.error("Failed to fetch my quote requests:", error.message);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    bodyPart: r.body_part,
    size: r.size,
    style: r.style,
    budgetMin: r.budget_min,
    budgetMax: r.budget_max,
    status: r.status,
    createdAt: r.created_at,
    bidCount: 0,
    userName: null,
  }));
}
