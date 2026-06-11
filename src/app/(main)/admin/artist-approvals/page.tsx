import { fetchPendingArtists } from "@/lib/supabase/artist-approval-queries";
import { ArtistApprovalsClient } from "./ArtistApprovalsClient";

// 관리자 도구 — 항상 최신. (AdminLayout 이 is_admin 검증 후 렌더)
export const dynamic = "force-dynamic";

export default async function Page(): Promise<React.ReactElement> {
  // Server-First: 초기 1페이지를 서버에서 페칭 → 클라이언트는 검색/페이지네이션/액션 시에만 재페칭.
  const initial = await fetchPendingArtists({ page: 1, search: "" });
  return <ArtistApprovalsClient initial={initial} />;
}
