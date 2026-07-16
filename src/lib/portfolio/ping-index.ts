/**
 * 작품 상세 색인 요청 — 서버 route(인증 + 공개 게이트 + 검색엔진 통지)를 keepalive fetch 로 호출.
 * server action 큐를 타지 않아 작성/수정 UX 를 지연시키지 않고, keepalive 로 직후 네비게이션에도 전송 보장.
 * 실패는 흡수(색인 핑은 SEO 부가기능, 사용자 흐름과 무관). client 헬퍼(브라우저 fetch)이므로 server-only 아님.
 */
export function requestPortfolioIndexPing(portfolioId: string): void {
  void fetch("/api/portfolios/ping-index", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ portfolioId }),
    keepalive: true,
  }).catch(() => {
    /* fire-and-forget */
  });
}
