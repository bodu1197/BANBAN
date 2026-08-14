import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { targetKey } from "./targets";

/** PostgREST max-rows(1000) 안쪽으로 잡은 스캔 페이지 크기. */
const REGION_SCAN_PAGE = 500;

/** 이미 발행된 (region_name|style) 키 집합 — pickNext 가 건너뛸 대상 판별용. */
export async function fetchPublishedLocationKeys(): Promise<Set<string>> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("location_seo_pages")
    .select("region_name, style");
  return new Set(
    ((data ?? []) as { region_name: string; style: string }[]).map((r) =>
      targetKey(r.region_name, r.style),
    ),
  );
}

/**
 * 활동 샵이 1곳 이상인 지역명 — 지역 랜딩 생성 대상.
 *
 * 샵 수 많은 순 → 이름순으로 정렬해 **매 실행에서 순서가 같도록** 고정한다(정렬이 흔들리면
 * pickNext 가 매번 다른 지역을 집어들어 큐 진행이 뒤엉킨다). 샵이 많은 지역부터 만들어야
 * 페이지 내용도 충실하고 검색 성과도 먼저 난다.
 */
export async function fetchRegionNamesWithActiveShops(): Promise<string[]> {
  const supabase = createAdminClient();
  const counts = new Map<string, number>();

  // PostgREST 는 max-rows(=1000) 로 응답을 조용히 자른다. 한 번에 다 받으면 샵이 1000곳을 넘는 순간
  // 뒤쪽(=신규·소규모) 지역이 대상에서 통째로 사라지고 에러도 안 난다 — 페이지로 끝까지 읽는다.
  for (let offset = 0; ; offset += REGION_SCAN_PAGE) {
    const { data, error } = await supabase
      .from("artists")
      .select("region:regions(name)")
      .eq("status", "active")
      .eq("is_hide", false)
      .is("deleted_at", null)
      .order("id", { ascending: true })
      .range(offset, offset + REGION_SCAN_PAGE - 1);

    // 조회 실패를 빈 배열로 삼키면 크론이 "발행할 대상 0건" 을 성공으로 보고하며 영영 아무것도 안 만든다.
    if (error) throw new Error(`fetchRegionNamesWithActiveShops: ${error.message}`);

    const rows = (data ?? []) as { region: { name: string } | null }[];
    for (const row of rows) {
      const name = row.region?.name?.trim();
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    if (rows.length < REGION_SCAN_PAGE) break;
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
    .map(([name]) => name);
}

/** regions.name → { id, name }. 없으면 null. */
export async function resolveRegionByName(
  name: string,
): Promise<{ id: string; name: string } | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("regions")
    .select("id, name")
    .eq("name", name)
    .limit(1)
    .maybeSingle();
  return (data as { id: string; name: string } | null) ?? null;
}

/**
 * 지역 단위 실데이터 통계 — 활동 샵 수 + 등록 작품 수.
 * thin-content 회피용. region×style 정밀 카운트는 카테고리 입도가 세분화(예: '그라데이션립'이
 * '입술' 분류 밖)되어 누락이 생기므로, 신뢰 가능한 지역 단위 집계(활동 샵·작품 수)를 사용.
 */
export async function fetchRegionStats(
  regionId: string,
): Promise<{ artistCount: number; portfolioCount: number }> {
  const supabase = createAdminClient();
  const { data: artists } = await supabase
    .from("artists")
    .select("id")
    .eq("region_id", regionId)
    .eq("status", "active")
    // is_hide 를 빼면 페이지가 "샵 N곳" 이라고 써놓고 실제 링크는 그보다 적게 나온다
    // (숨긴 샵 수가 사용자에게 산술로 드러난다). 지역 랜딩의 다른 두 쿼리와 술어를 맞춘다.
    .eq("is_hide", false)
    .is("deleted_at", null);
  const artistIds = ((artists ?? []) as { id: string }[]).map((a) => a.id);
  if (artistIds.length === 0) return { artistCount: 0, portfolioCount: 0 };

  const { count } = await supabase
    .from("portfolios")
    .select("*", { count: "exact", head: true })
    .in("artist_id", artistIds)
    .is("deleted_at", null);
  return { artistCount: artistIds.length, portfolioCount: count ?? 0 };
}

export async function insertLocationSeoPage(
  row: Database["public"]["Tables"]["location_seo_pages"]["Insert"],
): Promise<{ id: string } | { error: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("location_seo_pages")
    .insert(row)
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { id: (data as { id: string }).id };
}
