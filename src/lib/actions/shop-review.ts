"use server";

import { getUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { REQUIRED_PORTFOLIOS } from "@/lib/artist-status";
// REQUIRED_PORTFOLIOS 는 artist-status(순수 모듈)에 둔다 — 'use server' 파일은 async 함수만 export 가능.

export interface ShopReviewResult {
  ok: boolean;
  hasBanner: boolean;
  portfolioCount: number;
}

/**
 * 작성 중(draft) 샵의 검수 신청 — 대표 배너 + 포트폴리오 10개 충족 시 draft→pending 으로 전환.
 * 미달이면 ok=false + 현재 충족 현황 반환(클라가 안내·리다이렉트). 모든 write 는 createAdminClient(RLS 우회).
 */
export async function requestShopReview(): Promise<ShopReviewResult> {
  const user = await getUser();
  if (!user) return { ok: false, hasBanner: false, portfolioCount: 0 };

  const admin = createAdminClient();
  const { data: artist } = await admin
    .from("artists")
    .select("id, status, banner_path")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  // 작성 중(draft)만 신청 가능 — 이미 pending/active/rejected 면 무시.
  if (!artist || artist.status !== "draft") {
    return { ok: false, hasBanner: false, portfolioCount: 0 };
  }

  const hasBanner = artist.banner_path !== null && artist.banner_path !== "";
  const { count } = await admin
    .from("portfolios")
    .select("id", { count: "exact", head: true })
    .eq("artist_id", artist.id)
    .is("deleted_at", null);
  const portfolioCount = count ?? 0;

  if (!hasBanner || portfolioCount < REQUIRED_PORTFOLIOS) {
    return { ok: false, hasBanner, portfolioCount };
  }

  // .eq("status","draft") 로 동시 변경(레이스) 방지 — 0행이면 이미 다른 상태로 전환된 것.
  const { data: updated } = await admin
    .from("artists").update({ status: "pending" })
    .eq("id", artist.id).eq("status", "draft").select("id");
  if (!updated?.length) return { ok: false, hasBanner, portfolioCount };
  revalidatePath("/mypage");
  return { ok: true, hasBanner: true, portfolioCount };
}
