import { describe, it, expect, vi } from "vitest";
import { settledCount, type SitemapCountResult } from "@/lib/sitemap-utils";

const fulfilled = (value: { count: number | null } | number): SitemapCountResult => ({
  status: "fulfilled",
  value,
});
const rejected = (reason: unknown): SitemapCountResult => ({ status: "rejected", reason });

describe("settledCount — 사이트맵 인덱스 개수 집계", () => {
  it("Supabase count 응답에서 숫자를 꺼낸다", () => {
    expect(settledCount(fulfilled({ count: 627 }))).toBe(627);
  });

  it("숫자를 그대로 돌려주는 카운터(countPublicPortfolios)도 받는다", () => {
    expect(settledCount(fulfilled(42))).toBe(42);
  });

  it("count 가 null 이면 0 — 쿼리는 성공했지만 집계가 없는 경우", () => {
    expect(settledCount(fulfilled({ count: null }))).toBe(0);
  });

  it("실패한 항목은 0 으로 강등해 인덱스 전체가 500 이 되지 않게 한다", () => {
    expect(settledCount(rejected(new Error("boom")))).toBe(0);
  });

  it("실패를 onError 로 알린다 — 조용히 빠지면 그 콘텐츠가 사이트맵에서 사라져도 아무도 모른다", () => {
    const onError = vi.fn();
    const reason = new Error("db down");
    expect(settledCount(rejected(reason), onError)).toBe(0);
    expect(onError).toHaveBeenCalledWith(reason);
  });

  it("성공했을 때는 onError 를 부르지 않는다", () => {
    const onError = vi.fn();
    settledCount(fulfilled({ count: 1 }), onError);
    expect(onError).not.toHaveBeenCalled();
  });
});
