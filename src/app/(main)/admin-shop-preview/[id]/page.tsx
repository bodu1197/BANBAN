import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/supabase/is-current-user-admin";
import { renderAdminArtistPreviewPage } from "@/lib/pages/artist-detail-page";

// 관리자 전용 샵 검수 미리보기 — pending/rejected 샵을 실제 샵 페이지 그대로 렌더.
// /admin 레이아웃(사이드바) 밖에 둬 공개 샵 화면과 동일하게 보이도록 함.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "샵 검수 미리보기 | 관리자", robots: { index: false } };

export default async function AdminShopPreviewPage({ params }: Readonly<{ params: Promise<{ id: string }> }>): Promise<React.ReactElement> {
  // 비관리자에겐 존재 자체를 숨김(404) — 타인의 비공개 pending 샵 노출 차단.
  if (!(await isCurrentUserAdmin())) notFound();
  const { id } = await params;
  return renderAdminArtistPreviewPage(id);
}
