import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin-guard";
import { isSafeStoragePath } from "@/lib/supabase/storage-utils";
import { notifySearchEngines } from "@/lib/utils/search-notify";

import type { BusinessHoursMap } from "@/types/artist-form";
import { parseIntroduceQA } from "@/types/artist-form";

interface ArtistPatchBody {
  type_artist?: string;
  title?: string;
  contact?: string;
  instagram_url?: string | null;
  kakao_url?: string | null;
  zipcode?: string | null;
  address?: string;
  address_detail?: string | null;
  region_id?: string;
  introduce?: string;
  introduce_qa?: unknown;
  description?: string | null;
  profile_image_path?: string | null;
  banner_path?: string | null;
  lat?: number | null;
  lon?: number | null;
  business_hours?: BusinessHoursMap;
  // 카테고리 동기화 — undefined 면 손대지 않음, 빈 배열이면 모두 제거
  shop_category_ids?: string[];
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_ARTIST_FIELDS: ReadonlyArray<keyof ArtistPatchBody> = [
  "type_artist", "title", "contact", "instagram_url", "kakao_url",
  "zipcode", "address", "address_detail", "region_id",
  "introduce", "introduce_qa", "description", "profile_image_path", "banner_path", "lat", "lon",
  "business_hours",
];

function buildArtistUpdates(body: ArtistPatchBody): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED_ARTIST_FIELDS) {
    // eslint-disable-next-line security/detect-object-injection -- key from allow-list
    if (body[key] !== undefined) {
      // eslint-disable-next-line security/detect-object-injection -- key from allow-list
      updates[key] = body[key];
    }
  }
  // 샵 이름은 등록 경로(buildArtistRow)와 동일하게 trim — isTitleTaken 사전검사·유니크 인덱스와 정합.
  if (typeof updates.title === "string") updates.title = updates.title.trim();
  return updates;
}

async function syncCategorizables(
  supabase: SupabaseClient,
  artistId: string,
  categoryIds: ReadonlyArray<string>,
): Promise<{ error?: string }> {
  const { error: delError } = await supabase
    .from("categorizables")
    .delete()
    .eq("categorizable_type", "artist")
    .eq("categorizable_id", artistId);
  if (delError) return { error: `categorizables delete: ${delError.message}` };

  if (categoryIds.length === 0) return {};

  const rows = categoryIds.map((catId) => ({
    category_id: catId,
    categorizable_type: "artist" as const,
    categorizable_id: artistId,
  }));
  const { error: insError } = await supabase.from("categorizables").insert(rows);
  if (insError) return { error: `categorizables insert: ${insError.message}` };
  return {};
}

/** profile_image_path 쓰기 경계 검증 — 외부 URL/경로 탈출 주입 차단 (스토리지 경로만 허용). */
function validateProfileImagePath(body: ArtistPatchBody): NextResponse | null {
  if (typeof body.profile_image_path === "string" && body.profile_image_path.length > 0 && !isSafeStoragePath(body.profile_image_path)) {
    return NextResponse.json({ error: "profile_image_path 는 스토리지 경로만 허용됩니다." }, { status: 400 });
  }
  if (typeof body.banner_path === "string" && body.banner_path.length > 0 && !isSafeStoragePath(body.banner_path)) {
    return NextResponse.json({ error: "banner_path 는 스토리지 경로만 허용됩니다." }, { status: 400 });
  }
  return null;
}

/** artists 테이블 업데이트 적용 — 변경 필드가 있을 때만 쿼리, 에러 시 500 응답. */
async function applyArtistUpdates(
  supabase: SupabaseClient,
  id: string,
  body: ArtistPatchBody,
): Promise<NextResponse | null> {
  const updates = buildArtistUpdates(body);
  // introduce_qa 는 raw jsonb 주입 방지 — 허용 형식으로 sanitize 후 저장.
  if (body.introduce_qa !== undefined) {
    updates.introduce_qa = parseIntroduceQA(body.introduce_qa);
  }
  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from("artists").update(updates).eq("id", id);
    if (error) {
      // 샵 이름 유니크 인덱스(artists_title_unique_idx) 위반 → 친절한 중복 안내.
      if (error.code === "23505" && (error.message ?? "").includes("title")) {
        return NextResponse.json({ error: "이미 사용 중인 샵 이름입니다." }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  return null;
}

/** shop_category_ids 동기화 — UUID 형식 검증 후 categorizables 재동기화 (undefined 면 손대지 않음). */
async function applyCategorySync(
  supabase: SupabaseClient,
  id: string,
  body: ArtistPatchBody,
): Promise<NextResponse | null> {
  if (body.shop_category_ids === undefined) return null;
  // FK 가 잘못된 ID 를 막아주지만 일찍 400 으로 반환 — 디버깅 + 부분 실행 방지
  if (!body.shop_category_ids.every((cid) => UUID_REGEX.test(cid))) {
    return NextResponse.json({ error: "유효하지 않은 category UUID 형식이 있습니다." }, { status: 400 });
  }
  const result = await syncCategorizables(supabase, id, body.shop_category_ids);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
  return null;
}

/** PATCH /api/admin/artists/[id] — admin 전용 아티스트 샵 정보 + 카테고리 일괄 수정 (RLS 우회) */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "유효한 UUID 형식이 아닙니다." }, { status: 400 });
  }

  const body = await request.json() as ArtistPatchBody;

  const imagePathError = validateProfileImagePath(body);
  if (imagePathError) return imagePathError;

  const updateError = await applyArtistUpdates(auth.supabase, id, body);
  if (updateError) return updateError;

  const categoryError = await applyCategorySync(auth.supabase, id, body);
  if (categoryError) return categoryError;

  revalidatePath(`/artists/${id}`);
  notifySearchEngines(`/artists/${id}`);

  return NextResponse.json({ success: true });
}

/** GET /api/admin/artists/[id] — admin 진입 사전 검증용 (존재 여부만) */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "유효한 UUID 형식이 아닙니다." }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("artists")
    .select("id, title, user_id")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) return NextResponse.json({ error: "아티스트를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ artist: data });
}
