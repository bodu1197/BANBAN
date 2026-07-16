import { MIN_PORTFOLIO_MEDIA } from "./artist-visibility";

/**
 * 공개 포폴 술어 SSOT — 목록/사이트맵/카운트/상세/ping 이 모두 공유한다.
 * portfolio-listing-queries 와 portfolio-detail-queries 양쪽이 쓰는데 listing 은
 * home-portfolio→queries→detail 로 순환하므로, 술어만 순수 모듈로 분리해 순환을 차단한다
 * (이 파일은 artist-visibility 만 import — 순환 고리에 들어가지 않는다).
 *
 * 공개 정의: 승인 완료(approved_at NOT NULL = active/dormant) + 미숨김 + 미삭제 아티스트,
 * 미디어 ≥ MIN_PORTFOLIO_MEDIA, 삭제 안 된 유가(price>0) 포폴.
 * ⚠️ 모든 호출부는 select 에 `artist:artists!inner(...)` 임베드 필수 — 없으면 artist.* 필터가
 * 부모(portfolios)를 못 걸러 비공개 포폴이 조용히 노출된다(A01).
 * (광고 부스트는 media≥5 를 면제하므로 이 함수가 아니라 fetchAdPortfoliosGeneric 의
 *  isAdEligibleArtist 로 별도 처리된다.)
 */
export function filterPublicPortfolios<
  T extends {
    is(column: string, value: null): T;
    not(column: string, operator: "is", value: null): T;
    eq(column: string, value: boolean): T;
    gt(column: string, value: number): T;
    gte(column: string, value: number): T;
  },
>(query: T): T {
  return query
    .is("deleted_at", null)
    .gt("price", 0)
    .not("artist.approved_at", "is", null)
    .eq("artist.is_hide", false)
    .is("artist.deleted_at", null)
    .gte("artist.portfolio_media_count", MIN_PORTFOLIO_MEDIA);
}
