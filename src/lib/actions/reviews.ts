"use server";

import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";
import { earnPointsWithLimit } from "@/lib/supabase/point-queries";

export async function submitReview(
  artistId: string,
  rating: number,
  content: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "unauthorized" };
  }

  if (rating < 1 || rating > 5) {
    return { success: false, error: "invalid rating" };
  }

  if (!content.trim()) {
    return { success: false, error: "content required" };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("reviews").insert({
    artist_id: artistId,
    user_id: user.id,
    rating,
    content: content.trim(),
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // 리뷰 작성 포인트 (1회/일)
  void earnPointsWithLimit({ userId: user.id, amount: 20_000, reason: "REVIEW", description: "리뷰 작성" });

  revalidatePath(`/artists/${artistId}`);
  return { success: true };
}
