import { unstable_cache } from "next/cache";
import { createStaticClient } from "./server";

export interface SearchableCategory {
  id: string;
  name: string;
}

/**
 * 키워드 매칭 대상 카테고리 — 시술 카테고리만. 목록/통합 검색이 공유하는 중립 모듈이다.
 *
 * SHOP 타입(주차가능·당일예약·남성/여성 아티스트 등 샵 속성)은 뺀다: search_portfolios_by_category_ids
 * 가 SHOP 카테고리에 걸리면 그 샵의 **전 작품**을 반환해서, 검색어에 우연히 이름이 스치면 결과가
 * 통째로 오염된다.
 *
 * 사실상 불변이라 캐시 — 매 요청 조회하면 카테고리 RPC 앞에 왕복이 하나 더 붙는다.
 * 실패 시 throw 하는 이유: 빈 배열을 캐시하면 카테고리 매칭이 1시간 죽고 라우트의 60초 캐시로는
 * 회복이 안 돼 "제목만 검색하던 예전 상태" 로 조용히 퇴화한다. 호출부가 catch 해서 그 경로만 포기한다.
 */
export const fetchSearchCategories = unstable_cache(
  async (): Promise<SearchableCategory[]> => {
    const { data, error } = await createStaticClient()
      .from("categories")
      .select("id, name, category_type")
      .neq("category_type", "SHOP");
    if (error) throw new Error(`검색 카테고리 조회 실패: ${error.message}`);
    return (data ?? []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }));
  },
  ["searchable-categories"],
  { revalidate: 3600, tags: ["categories"] },
);
