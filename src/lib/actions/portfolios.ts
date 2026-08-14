"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { LISTING_CACHE_TAG } from "@/lib/supabase/portfolio-listing-queries";

/** 본인 샵이거나 관리자일 때만 통과. 아니면 throw. */
async function assertCanRevalidateArtist(artistId: string): Promise<void> {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { data: artist } = await supabase
    .from("artists")
    .select("user_id")
    .eq("id", artistId)
    .single();
  if (!artist) throw new Error("Artist not found");
  if ((artist as { user_id?: string } | null)?.user_id === user.id) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if ((profile as { is_admin?: boolean } | null)?.is_admin !== true) throw new Error("Forbidden");
}

/**
 * 포트폴리오 등록/수정/삭제 직후 호출 — 그 작품이 보이는 페이지 캐시를 무효화한다.
 *
 * - /mypage/artist/portfolios : 본인 포트폴리오 목록 (router cache 가 stale list 노출하던 버그)
 * - /artists/[artistId]       : 공개 샵 페이지 (포트폴리오 카운트/그리드 표시)
 * - /portfolios/[portfolioId] : 그 작품 상세. 저장 직후 구글에 색인 핑을 쏘므로(PortfolioEditClient)
 *                               여기서 안 지우면 최대 10분 낡은 HTML 을 크롤시킨다.
 * - 목록 1페이지 + /page/N    : LISTING_CACHE_TAG 로 한 번에.
 *
 * Security: 인증된 사용자가 본인 아티스트의 페이지만 revalidate 가능.
 */
export async function revalidatePortfolioPages(artistId: string, portfolioId?: string): Promise<void> {
  if (!isUuid(artistId)) {
    throw new Error("Invalid artist id");
  }
  if (portfolioId !== undefined && !isUuid(portfolioId)) {
    throw new Error("Invalid portfolio id");
  }

  await assertCanRevalidateArtist(artistId);

  revalidatePath("/mypage/artist/portfolios");
  revalidatePath(`/artists/${artistId}`);
  if (portfolioId) revalidatePath(`/portfolios/${portfolioId}`);
  // 목록 1페이지 + 2페이지 이상(별도 경로 라우트) 을 한 번에 무효화한다.
  // 예전의 `revalidatePath("/portfolios/page/[n]", "page")` 는 아무것도 안 지웠다 — 실제 태그는
  // 라우트그룹이 들어간 `_N_T_/(main)/portfolios/page/[n]/page` 인데 그룹 없는 경로를 넘겼기 때문이다
  // (빌드 산출물 .meta 의 x-next-cache-tags 로 확인). HTML 만 지워도 300초 데이터 캐시가 남아
  // 곧바로 옛 목록으로 다시 그려지므로, 데이터 캐시까지 같이 달고 있는 태그로 지운다.
  revalidateTag(LISTING_CACHE_TAG, { expire: 0 });
}
