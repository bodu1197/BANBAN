"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * 포트폴리오 등록/수정/삭제 직후 호출 — 다음 두 페이지 캐시 즉시 무효화.
 *
 * - /mypage/artist/portfolios : 본인 포트폴리오 목록 (router cache 가 stale list 노출하던 버그)
 * - /artists/[artistId]       : 공개 샵 페이지 (포트폴리오 카운트/그리드 표시)
 *
 * Security: 인증된 사용자가 본인 아티스트의 페이지만 revalidate 가능.
 */
export async function revalidatePortfolioPages(artistId: string): Promise<void> {
  if (typeof artistId !== "string" || !UUID_REGEX.test(artistId)) {
    throw new Error("Invalid artist id");
  }

  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { data: artist } = await supabase
    .from("artists")
    .select("user_id")
    .eq("id", artistId)
    .single();
  const isOwner = (artist as { user_id?: string } | null)?.user_id === user.id;
  if (!isOwner) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    const isAdmin = (profile as { is_admin?: boolean } | null)?.is_admin === true;
    if (!isAdmin) throw new Error("Forbidden");
  }

  revalidatePath("/mypage/artist/portfolios");
  revalidatePath(`/artists/${artistId}`);
}
