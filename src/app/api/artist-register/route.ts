import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { escapeIlike } from "@/lib/supabase/queries";
import { isHttpUrl } from "@/lib/url-utils";
import { DAY_KEYS, isDayHours, parseIntroduceQA } from "@/types/artist-form";
import type { BusinessHoursMap } from "@/types/artist-form";
import type { Database, Json } from "@/types/database";

interface RegisterBody {
  type_artist: string;
  type_sex: string;
  title: string;
  contact: string;
  instagram_url: string | null;
  kakao_url: string | null;
  zipcode: string;
  address: string;
  address_detail: string | null;
  region_id: string;
  introduce: string;
  introduce_qa?: unknown;
  description: string | null;
  lat: number | null;
  lon: number | null;
  business_hours: BusinessHoursMap;
}

const MAX_TITLE_LENGTH = 200;
const MAX_INTRODUCE_LENGTH = 5000;
const MAX_URL_LENGTH = 500;

function isValidSocialUrl(value: string): boolean {
  return value.length <= MAX_URL_LENGTH && isHttpUrl(value);
}

function checkTitleField(body: RegisterBody): string | null {
  if (!body.title?.trim() || body.title.length > MAX_TITLE_LENGTH) {
    return "title is required and must be <= 200 chars";
  }
  return null;
}

function checkIntroduceField(body: RegisterBody): string | null {
  if (!body.introduce?.trim() || body.introduce.length > MAX_INTRODUCE_LENGTH) {
    return "introduce is required and must be <= 5000 chars";
  }
  return null;
}

function checkRequiredStringField(value: string | null | undefined, name: string): string | null {
  return value?.trim() ? null : `${name} is required`;
}

function validateRequiredStrings(body: RegisterBody): string | null {
  return (
    checkTitleField(body) ??
    checkRequiredStringField(body.contact, "contact") ??
    checkRequiredStringField(body.address, "address") ??
    checkRequiredStringField(body.region_id, "region_id") ??
    checkIntroduceField(body)
  );
}

function validateOptionalUrls(body: RegisterBody): string | null {
  if (body.instagram_url && !isValidSocialUrl(body.instagram_url)) {
    return "instagram_url must be a valid http(s) URL";
  }
  if (body.kakao_url && !isValidSocialUrl(body.kakao_url)) {
    return "kakao_url must be a valid http(s) URL";
  }
  return null;
}

function validateCoordinates(body: RegisterBody): string | null {
  if (body.lat !== null && (!Number.isFinite(body.lat) || body.lat < -90 || body.lat > 90)) {
    return "lat out of range";
  }
  if (body.lon !== null && (!Number.isFinite(body.lon) || body.lon < -180 || body.lon > 180)) {
    return "lon out of range";
  }
  return null;
}

function validateSingleDay(key: string, val: unknown): string | null {
  if (val !== null && !isDayHours(val)) return `${key}: must be {open: "HH:MM", close: "HH:MM"} or null`;
  return null;
}

function validateBusinessHours(bh: unknown): string | null {
  if (bh === null || bh === undefined) return "business_hours is required";
  if (typeof bh !== "object" || Array.isArray(bh)) return "business_hours must be an object";
  const VALID_DAYS = new Set<string>(DAY_KEYS);
  const entries = Object.entries(bh as Record<string, unknown>);
  for (const [key, val] of entries) {
    if (!VALID_DAYS.has(key)) return `invalid day key: ${key}`;
    const dayErr = validateSingleDay(key, val);
    if (dayErr) return dayErr;
  }
  if (!entries.some(([, v]) => v !== null)) return "at least one day must have business hours";
  return null;
}

function validateRegisterBody(body: RegisterBody): string | null {
  return (
    validateRequiredStrings(body) ??
    validateOptionalUrls(body) ??
    validateCoordinates(body) ??
    validateBusinessHours(body.business_hours)
  );
}

interface PatchBody {
  artistId: string;
  categoryIds: string[];
}

async function requireAuth(): Promise<{ user: { id: string }; error?: NextResponse }> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { user: null as never, error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { user };
}

/**
 * 동일 샵 이름 존재 여부(대소문자·앞뒤공백 무시, 비삭제 샵 대상). 등록 사전 검사 + 이름 가용성 GET 공용.
 * 현재는 이 사전 검사가 '활성 차단'(친절 메시지). DB 유니크 인덱스(artists_title_unique_idx, lower(btrim(title)))는
 * 기존 중복 정리 후 적용 예정 — 적용되면 동시요청 레이스까지 막는 최종 방어선(아래 23505 처리)이 된다.
 * 저장 title 은 trim 되므로(buildArtistRow) 대소문자 무시 정확일치로 충분.
 */
async function isTitleTaken(admin: SupabaseClient<Database>, title: string): Promise<boolean> {
  const normalized = title.trim();
  if (!normalized) return false;
  const { data } = await admin
    .from("artists")
    .select("id")
    .ilike("title", escapeIlike(normalized)) // 와일드카드 이스케이프 → 대소문자 무시 '정확 일치'
    .is("deleted_at", null)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

function buildArtistRow(userId: string, body: RegisterBody): Database["public"]["Tables"]["artists"]["Insert"] {
  return {
    user_id: userId,
    type_artist: body.type_artist,
    type_sex: body.type_sex,
    title: body.title.trim(),
    contact: body.contact,
    instagram_url: body.instagram_url,
    kakao_url: body.kakao_url,
    zipcode: body.zipcode,
    address: body.address,
    address_detail: body.address_detail,
    region_id: body.region_id,
    introduce: body.introduce,
    introduce_qa: parseIntroduceQA(body.introduce_qa) as unknown as Json,
    description: body.description,
    lat: body.lat,
    lon: body.lon,
    business_hours: body.business_hours as unknown as Json,
    is_hide: false,
    likes_count: 0,
    views_count: 0,
    // 등록 직후 '작성 중(draft)' — 비공개. 배너+포폴 REQUIRED_PORTFOLIOS개 채우고 '지금 공개하기'(publishShop)하면 즉시 active 공개(사전승인 폐지).
    // approved_at NULL → RLS(artists_select) 와 모든 공개 리스트 게이트가 자동 차단(비공개 유지).
    status: "draft",
    approved_at: null,
  };
}

/** GET /api/artist-register?name=... — 샵 이름 가용성(중복 여부) 사전 확인. 위저드 1단계 빠른 실패용. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const name = request.nextUrl.searchParams.get("name") ?? "";
  const admin = createAdminClient();
  const taken = await isTitleTaken(admin, name);
  return NextResponse.json({ available: !taken });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("artists")
    .select("id")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "already_registered", artistId: existing.id },
      { status: 409 },
    );
  }

  const body = await request.json() as RegisterBody;
  const validationError = validateRegisterBody(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  // 동일 샵 이름 차단 — 같은 이름 무한 생성(계정별 1샵 우회) 방지. 사전 검사(친절 메시지).
  if (await isTitleTaken(admin, body.title)) {
    return NextResponse.json({ error: "duplicate_name" }, { status: 409 });
  }

  const { data: artist, error: insertError } = await admin
    .from("artists")
    .insert(buildArtistRow(auth.user.id, body))
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      // title 유니크 인덱스 위반 → 중복 이름, 그 외(user_id) → 이미 등록(동시요청 레이스).
      const isTitleConflict = (insertError.message ?? "").includes("title");
      return NextResponse.json({ error: isTitleConflict ? "duplicate_name" : "already_registered" }, { status: 409 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 시술사 등록 즉시 profiles.role='artist' 동기화 — 별도 promote-to-artist 호출 실패 시의
  // role=user + artists 행 존재 모순을 근본 차단(M13). service_role 이라 role 변경 트리거 우회.
  // 실패해도 artists 행은 유지되며 다음 로그인 시 auth 콜백(syncArtistRole)이 자가 치유.
  const { error: roleError } = await admin
    .from("profiles").update({ role: "artist" }).eq("id", auth.user.id);
  if (roleError) {
    // eslint-disable-next-line no-console
    console.error("[artist-register] role sync failed (콜백 자가 치유 대상):", roleError.message);
  }

  return NextResponse.json({ artistId: artist.id });
}

async function verifyArtistOwnership(
  admin: SupabaseClient<Database>, artistId: string, userId: string,
): Promise<NextResponse | null> {
  const { data: artist } = await admin
    .from("artists")
    .select("id, user_id")
    .eq("id", artistId)
    .single();

  if (!artist || artist.user_id !== userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json() as PatchBody;
  if (!body.artistId || !body.categoryIds?.length) {
    return NextResponse.json({ error: "artistId and categoryIds required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const forbidden = await verifyArtistOwnership(admin, body.artistId, auth.user.id);
  if (forbidden) return forbidden;

  const categorizables = body.categoryIds.map((catId) => ({
    category_id: catId,
    categorizable_type: "artist" as const,
    categorizable_id: body.artistId,
  }));

  const { error } = await admin.from("categorizables").insert(categorizables);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
