"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";

export interface ToggleLikeResult {
  success: boolean;
  isLiked: boolean;
  error?: string;
}

interface LikeRow {
  id: string;
  likeable_id: string;
}

/**
 * Toggle like for an artist
 */
export async function toggleLike(artistId: string): Promise<ToggleLikeResult> {
  const user = await getUser();

  if (!user) {
    return { success: false, isLiked: false, error: "unauthorized" };
  }

  const supabase = createAdminClient();

  // Check existing like
  const { data: existing } = await supabase
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("likeable_type", "artist")
    .eq("likeable_id", artistId)
    .maybeSingle() as { data: LikeRow | null };

  if (existing) {
    // Remove like
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("id", existing.id);

    if (error) {
      return { success: false, isLiked: true, error: error.message };
    }

    // Decrement count
    await supabase.rpc("decrement_likes_count", { artist_id_param: artistId });

    revalidatePath("/", "page");
    return { success: true, isLiked: false };
  }

  // Add like
  const { error } = await supabase.from("likes").insert({
    user_id: user.id,
    likeable_type: "artist",
    likeable_id: artistId,
  });

  if (error) {
    return { success: false, isLiked: false, error: error.message };
  }

  // Increment count
  await supabase.rpc("increment_likes_count", { artist_id_param: artistId });

  revalidatePath("/", "page");
  return { success: true, isLiked: true };
}


/**
 * Fetch liked artist IDs for the current user (lightweight, no joins)
 */
export async function fetchLikedArtistIds(): Promise<string[]> {
  const user = await getUser();
  if (!user) return [];

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("likes")
    .select("likeable_id")
    .eq("user_id", user.id)
    .eq("likeable_type", "artist") as { data: LikeRow[] | null };

  return (data ?? []).map((l) => l.likeable_id);
}

/**
 * Fetch liked artists with details for the likes page
 */
export async function fetchLikedArtists(): Promise<
  Array<{
    id: string;
    name: string;
    region: string;
    portfolioImage: string | null;
    likesCount: number;
  }>
> {
  const user = await getUser();

  if (!user) {
    return [];
  }

  const supabase = createAdminClient();

  const { data: likes } = await supabase
    .from("likes")
    .select("likeable_id")
    .eq("user_id", user.id)
    .eq("likeable_type", "artist")
    .order("created_at", { ascending: false }) as { data: LikeRow[] | null };

  if (!likes || likes.length === 0) {
    return [];
  }

  const artistIds = likes.map((l) => l.likeable_id);

  const { data: artists } = await supabase
    .from("artists")
    .select("id, title, address, likes_count, region:regions(name)")
    .in("id", artistIds)
    .is("deleted_at", null);

  if (!artists) {
    return [];
  }

  type ArtistRow = {
    id: string;
    title: string;
    address: string;
    likes_count: number;
    region: { name: string } | null;
  };

  return (artists as ArtistRow[]).map((artist) => ({
    id: artist.id,
    name: artist.title,
    region: artist.region?.name ?? artist.address,
    portfolioImage: null,
    likesCount: artist.likes_count,
  }));
}
