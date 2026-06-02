import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveSimIdentity, setAnonCookie, type SimIdentity } from "@/lib/beauty-sim/identity";
import { parseSimArea, SIM_AREA_LIMIT, type Quotas } from "@/lib/beauty-sim/shared";

// KST 자정(0시) 리셋 — 공지의 "내일 0시 이후"와 일치(권위는 SQL 의 Asia/Seoul 계산).
const RESET_HOUR_KST = 0;

/** 오늘 영역별 잔여 횟수 조회 (미차감). 동적 키 없이 읽어 object-injection 회피. */
async function readQuotas(identity: string): Promise<Quotas> {
  const { data } = await createAdminClient().rpc("get_sim_quota", { p_identity: identity });
  let eyebrowUsed = 0;
  let lipUsed = 0;
  for (const row of data ?? []) {
    if (row.area === "eyebrow") eyebrowUsed = row.used;
    else if (row.area === "lip") lipUsed = row.used;
  }
  return {
    eyebrow: Math.max(SIM_AREA_LIMIT - eyebrowUsed, 0),
    lip: Math.max(SIM_AREA_LIMIT - lipUsed, 0),
  };
}

/** 익명 쿠키 설정 + per-user 응답이므로 캐시 금지 */
function finalize(res: NextResponse, id: SimIdentity): NextResponse {
  if (id.isNewAnon && id.anonId) setAnonCookie(res, id.anonId);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

// GET: 마운트 시 영역별 잔여 표시 + 파이프라인 시작 전 사전 확인용 (차감 없음).
export async function GET(request: NextRequest): Promise<NextResponse> {
  const id = await resolveSimIdentity(request);
  const quotas = await readQuotas(id.identity);
  return finalize(
    NextResponse.json({ quotas, limit: SIM_AREA_LIMIT, resetHourKst: RESET_HOUR_KST }),
    id,
  );
}

// POST: 결과를 완전히 얻은 후 1회 커밋(차감). 원자적이라 한도를 절대 초과하지 않는다.
// (실패한 시뮬레이션은 커밋하지 않으므로 환불 개념이 필요 없다.)
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json().catch(() => null)) as { area?: unknown } | null;
  const area = parseSimArea(body?.area);
  if (!area) {
    return NextResponse.json(
      { error: "invalid area" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const id = await resolveSimIdentity(request);
  const { data, error } = await createAdminClient().rpc("consume_sim_quota", {
    p_identity: id.identity,
    p_area: area,
    p_limit: SIM_AREA_LIMIT,
  });
  if (error) {
    return NextResponse.json(
      { error: "잠시 후 다시 시도해주세요" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const used = data?.[0]?.used ?? SIM_AREA_LIMIT;
  const remaining = Math.max(SIM_AREA_LIMIT - used, 0);
  return finalize(NextResponse.json({ area, remaining }), id);
}
