import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PUBLIC_ENV, SERVER_ENV } from "@/lib/config/env";
import type { GeocodeResult } from "@/types/artist-form";

const KAKAO_LOCAL_URL = "https://dapi.kakao.com/v2/local/search/address.json";
// 카카오는 JS키를 REST 호출에 쓸 때 KA 헤더(os/origin)를 요구한다. 서버에서 직접 호출하므로 origin 을 명시.
// origin 은 SITE_URL(SSOT) 에서 파생 — 환경(로컬/스테이징/프로덕션)마다 등록 도메인과 일치시킨다.
const KA_HEADER = `sdk/1.0.0 os/javascript origin/${PUBLIC_ENV.SITE_URL.replace(/\/+$/, "")}`;
const MAX_ADDRESS_LENGTH = 200; // 과도하게 긴 입력으로 인한 남용 차단
const FETCH_TIMEOUT_MS = 5000;  // 외부 호출 지연 시 함수 행 방지
const EMPTY: GeocodeResult = { lat: null, lon: null };

// 카카오 응답에서 첫 결과 좌표만 안전하게 추출 — 외부 JSON 을 무검증 캐스팅하지 않는다.
// 카카오는 경도=x, 위도=y 를 문자열로 반환.
function firstCoord(data: unknown): { lat: number; lon: number } | null {
  if (typeof data !== "object" || data === null) return null;
  const docs = (data as { documents?: unknown }).documents;
  if (!Array.isArray(docs) || docs.length === 0) return null;
  const d = docs[0] as Record<string, unknown>;
  const lat = parseFloat(String(d.y));
  const lon = parseFloat(String(d.x));
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

// 주소 → 좌표 서버 프록시 (Kakao Local API).
// 클라가 외부 지오코더를 직접 호출하면 CSP(connect-src)에 막히고, 카카오 JS키도 KA 헤더가 필요하다.
// 서버에서 대신 호출하면 동일 출처('self')라 CSP 통과 + 키가 클라에 노출되지 않는다.
// 카카오는 한국 주소(지방 도로명 포함)를 완전 커버. 실패해도 좌표 없이 진행하도록 항상 200 + null.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const raw = request.nextUrl.searchParams.get("address")?.trim();
  const key = SERVER_ENV.KAKAO_REST_API_KEY;
  if (!raw || !key) return NextResponse.json(EMPTY);
  const address = raw.slice(0, MAX_ADDRESS_LENGTH);

  try {
    const res = await fetch(`${KAKAO_LOCAL_URL}?query=${encodeURIComponent(address)}`, {
      headers: { Authorization: `KakaoAK ${key}`, KA: KA_HEADER },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.ok) {
      const coord = firstCoord(await res.json());
      if (coord) {
        // 성공한 좌표만 하루 캐시 — 동일 주소 재조회 시 외부 호출 절약.
        return NextResponse.json(coord satisfies GeocodeResult, {
          headers: { "Cache-Control": "public, max-age=86400" },
        });
      }
    }
  } catch {
    // 타임아웃/네트워크/파싱 실패 — 좌표 없이 진행
  }
  return NextResponse.json(EMPTY);
}
