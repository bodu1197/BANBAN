import type { Metadata } from "next";
import { fetchArtistApprovals } from "@/lib/supabase/artist-approval-queries";
import { ArtistApprovalsClient } from "./ArtistApprovalsClient";

// 관리자 도구 — 항상 최신. (AdminLayout 이 is_admin 검증 후 렌더)
export const dynamic = "force-dynamic";
// 색인 차단(다중 방어 — robots.txt + 인증 게이트에 더해 명시적 noindex).
export const metadata: Metadata = { title: "샵 점검 관리 | 관리자", robots: { index: false, follow: false } };

export default async function Page(): Promise<React.ReactElement> {
  // Server-First: 초기 1페이지(승인 대기+반려 단일 목록)를 서버에서 페칭 → 클라이언트는 검색/페이지네이션/액션 시에만 재페칭.
  const initial = await fetchArtistApprovals({ page: 1, search: "", filter: "all" });
  return <ArtistApprovalsClient initial={initial} />;
}
