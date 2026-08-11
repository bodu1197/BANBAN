import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { addressToRegionKey } from "./regions";

/**
 * 주소 → regions.id. 등록/수정 폼(브라우저)과 등록 API(서버)가 같은 규칙을 쓰도록
 * supabase client 를 주입받는다 — 클라가 보낸 region_id 를 서버가 그대로 믿지 않기 위함.
 *
 * 구 단위 키("경기 용인시 수지구")가 없으면 시 단위("경기 용인시")로 한 번 더 찾는다.
 * ponytail: 행정구역 개편으로 없던 구가 생겨도 시 단위로 붙게 하는 안전망 — 그래도 못 찾으면 null.
 */
export async function resolveRegionByAddress(
  client: SupabaseClient<Database>,
  address: string,
): Promise<{ id: string; name: string } | null> {
  const key = addressToRegionKey(address);
  if (!key) return null;

  const parts = key.split(" ");
  const keys = parts.length > 2 ? [key, `${parts[0]} ${parts[1]}`] : [key];

  const { data, error } = await client.from("regions").select("id, name").in("name", keys);
  if (error) {
    // 조회 실패(네트워크·RLS)와 '그런 지역 없음'은 원인이 다르다 — 조용히 삼키면 원인 추적이 불가능해진다.
    // eslint-disable-next-line no-console
    console.error(`region lookup failed for "${key}": ${error.message}`);
    return null;
  }
  if (!data || data.length === 0) return null;

  // 가장 구체적인(긴) 이름 우선 — "경기 용인시 수지구" > "경기 용인시"
  return [...data].sort((a, b) => b.name.length - a.name.length)[0];
}
