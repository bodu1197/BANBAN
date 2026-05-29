import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { targetKey } from "./targets";

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
