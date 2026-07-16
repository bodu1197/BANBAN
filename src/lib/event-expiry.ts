/**
 * 이벤트 만료 판정(UTC 날짜 단위) — 종료일 당일=활성, 그 다음날부터 만료.
 * 목록(EventListClient)과 공개 상세(event-detail-page)가 공유하는 단일 JS 술어.
 * SQL 측 쌍둥이는 event-queries.ts `getActiveEventFilter`(동일 규칙의 gte 역술어) — 함께 바꿔야 정합.
 * ISO 날짜가 고정폭 접두사라 slice(0,10) 문자열 비교가 날짜 단위로 정확.
 * (순수 모듈: server 클라이언트를 import 하지 않아 client 컴포넌트에서도 사용 가능.)
 */
export function isEventExpiredByDate(eventEndAt: string | null): boolean {
  if (eventEndAt === null) return false;
  const todayUtc = new Date().toISOString().slice(0, 10);
  return eventEndAt.slice(0, 10) < todayUtc;
}
