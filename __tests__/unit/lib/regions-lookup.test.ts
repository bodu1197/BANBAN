import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { resolveRegionByAddress } from "@/lib/regions-lookup";

// 실제 regions 테이블의 축소판 — 조회는 이름 정확일치(.in)만 한다.
const TABLE = [
  { id: "r-suji", name: "경기 용인시 수지구" },
  { id: "r-hwaseong", name: "경기 화성시" },
  { id: "r-sejong", name: "세종 세종시" },
];

function fakeClient(result: { data: typeof TABLE | null; error?: { message: string } }): SupabaseClient<Database> {
  return {
    from: () => ({
      select: () => ({
        in: (_col: string, keys: string[]) =>
          Promise.resolve(
            result.error
              ? { data: null, error: result.error }
              : { data: (result.data ?? []).filter((r) => keys.includes(r.name)), error: null },
          ),
      }),
    }),
  } as unknown as SupabaseClient<Database>;
}

const db = fakeClient({ data: TABLE });

describe("resolveRegionByAddress", () => {
  it("구 단위가 있으면 구를 쓴다", async () => {
    expect(await resolveRegionByAddress(db, "경기 용인시 수지구 현암로 148")).toEqual({ id: "r-suji", name: "경기 용인시 수지구" });
  });

  it("구 단위가 없으면 시 단위로 붙는다 (행정구역 개편 안전망)", async () => {
    expect(await resolveRegionByAddress(db, "경기 화성시 동탄구 어딘가로 1")).toEqual({ id: "r-hwaseong", name: "경기 화성시" });
  });

  it("세종은 도로명이 두 번째로 와도 매칭된다", async () => {
    expect(await resolveRegionByAddress(db, "세종특별자치시 한누리대로 2130")).toEqual({ id: "r-sejong", name: "세종 세종시" });
  });

  it("목록에 없는 지역은 null — 조용히 다른 지역을 붙이지 않는다", async () => {
    expect(await resolveRegionByAddress(db, "전남 목포시 영산로 334")).toBeNull();
  });

  it("주소를 해석할 수 없으면 조회 없이 null", async () => {
    expect(await resolveRegionByAddress(db, "")).toBeNull();
    expect(await resolveRegionByAddress(db, "Tokyo Shibuya 1-1")).toBeNull();
  });

  it("조회 자체가 실패해도 null (호출부는 '지역을 찾지 못했다'로 안내)", async () => {
    const broken = fakeClient({ data: null, error: { message: "network down" } });
    expect(await resolveRegionByAddress(broken, "경기 용인시 수지구 현암로 148")).toBeNull();
  });
});
