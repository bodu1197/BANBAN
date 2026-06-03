// @client-reason: React Query Provider 런타임(Context) + next/dynamic ssr:false 클라이언트 전용 로딩 래퍼
"use client";

import dynamic from "next/dynamic";

// useQuery 사용 segment(mypage/admin/search/artists/events) layout.tsx 에서 공통으로 wrap.
// ssr:false — QueryProvider 는 client context 라 SSR 단계에서 서버 메모리 점유할 이유 없음.
// (children 의 SSR HTML 은 그대로 출력 — Provider 만 client hydration 시점에 로드)
const QueryProvider = dynamic(() => import("@/providers/QueryProvider").then(m => m.QueryProvider), { ssr: false });

export function SegmentQueryProvider({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return <QueryProvider>{children}</QueryProvider>;
}
