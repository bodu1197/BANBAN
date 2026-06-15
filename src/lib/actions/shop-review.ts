"use server";

import { getUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { REQUIRED_PORTFOLIOS } from "@/lib/artist-status";
import { notifyUser } from "@/lib/supabase/notification-queries";
import { notifySearchEngines } from "@/lib/utils/search-notify";
// REQUIRED_PORTFOLIOS 는 artist-status(순수 모듈)에 둔다 — 'use server' 파일은 async 함수만 export 가능.

export interface ShopPublishResult {
  ok: boolean;
  hasBanner: boolean;
  portfolioCount: number;
}

/**
 * 작성 중(draft) 샵의 즉시 공개 — 대표 배너 + 포트폴리오 REQUIRED_PORTFOLIOS개 충족 시 draft→active 로 바로 전환.
 *
 * 사전 관리자 승인 폐지(2026-06-14): 자격 게이트(배너+포폴 REQUIRED_PORTFOLIOS개, 2026-06-15 1→5 상향)
 * 충족 시 사람 승인 없이 즉시 공개하고, 관리자는 사후 점검/테이크다운으로 전환. reviewed_by 는 NULL 로 남겨 사후 점검 큐
 * (/admin/artist-approvals)에 '점검 필요'로 노출된다.
 *
 * 미달이면 ok=false + 현재 충족 현황 반환(클라가 안내·리다이렉트). 모든 write 는 createAdminClient(RLS 우회).
 */
export async function publishShop(): Promise<ShopPublishResult> {
  const user = await getUser();
  if (!user) return { ok: false, hasBanner: false, portfolioCount: 0 };

  const admin = createAdminClient();
  const { data: artist } = await admin
    .from("artists")
    .select("id, status, banner_path, title")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  // 작성 중(draft)만 공개 가능 — 이미 active/pending/rejected 면 무시.
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
  // reviewed_by 는 설정하지 않는다(NULL) → 사후 점검 큐에 노출.
  const { data: updated } = await admin
    .from("artists")
    .update({ status: "active", approved_at: new Date().toISOString() })
    .eq("id", artist.id).eq("status", "draft").select("id");
  if (!updated?.length) return { ok: false, hasBanner, portfolioCount };

  // 공개 즉시: 본인 인앱 알림(+푸시) + 검색엔진 색인 + 캐시 무효화.
  await notifyUser(user.id, {
    type: "SHOP_APPROVED",
    title: "샵 공개 완료 🎉",
    body: `'${artist.title}' 샵이 바로 공개되었습니다. 이제 검색·추천에 노출됩니다.`,
    data: { artistId: artist.id },
  });
  notifySearchEngines([`/artists/${artist.id}`]);
  revalidatePath("/mypage");
  revalidatePath("/");
  revalidatePath(`/artists/${artist.id}`);
  return { ok: true, hasBanner: true, portfolioCount };
}

const REREVIEW_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export interface ReReviewResult {
  ok: boolean;
  /** 실패 시 사용자 안내 메시지. */
  message?: string;
}

/**
 * 숨김(테이크다운) 처리된 본인 샵의 '재검토 요청' — 수정 후 관리자에게 재확인을 요청.
 * resubmitted_at 을 찍어 관리자 점검 큐에 '재검토 요청됨'으로 노출(관리자가 확인 후 복구).
 * 본인이 직접 공개 복구는 불가(모더레이션 통제 유지). 24h 쿨다운(요청 스팸 방지).
 */
export async function requestShopReReview(): Promise<ReReviewResult> {
  const user = await getUser();
  if (!user) return { ok: false, message: "로그인이 필요합니다." };

  const admin = createAdminClient();
  const { data: artist } = await admin
    .from("artists")
    .select("id, is_hide, resubmitted_at")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!artist || artist.is_hide !== true) {
    return { ok: false, message: "재검토 요청 대상이 아닙니다." };
  }

  if (artist.resubmitted_at) {
    const elapsed = Date.now() - new Date(artist.resubmitted_at).getTime();
    if (elapsed < REREVIEW_COOLDOWN_MS) {
      const hoursLeft = Math.ceil((REREVIEW_COOLDOWN_MS - elapsed) / (60 * 60 * 1000));
      return { ok: false, message: `재검토 요청은 24시간에 한 번만 가능합니다. (약 ${String(hoursLeft)}시간 후 다시 가능)` };
    }
  }

  // is_hide=true 가드(동시 복구 레이스 방지). status/approved_at 불변이라 self-approve 트리거 무관.
  const { data: updated } = await admin
    .from("artists").update({ resubmitted_at: new Date().toISOString() })
    .eq("id", artist.id).eq("is_hide", true).select("id");
  if (!updated?.length) return { ok: false, message: "처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." };

  revalidatePath("/mypage");
  return { ok: true };
}
