import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin-guard";

import type { BusinessHoursMap } from "@/types/artist-form";

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
  description?: string | null;
  profile_image_path?: string | null;
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
  "introduce", "description", "profile_image_path", "lat", "lon",
  "business_hours",
];

function buildArtistUpdates(body: ArtistPatchBody): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED_ARTIST_FIELDS) {
    if (body[key] !== undefined) {
      // eslint-disable-next-line security/detect-object-injection -- key from allow-list
      updates[key] = body[key];
    }
  }
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
  const updates = buildArtistUpdates(body);

  if (Object.keys(updates).length > 0) {
    const { error } = await auth.supabase.from("artists").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.shop_category_ids !== undefined) {
    // FK 가 잘못된 ID 를 막아주지만 일찍 400 으로 반환 — 디버깅 + 부분 실행 방지
    if (!body.shop_category_ids.every((cid) => UUID_REGEX.test(cid))) {
      return NextResponse.json({ error: "유효하지 않은 category UUID 형식이 있습니다." }, { status: 400 });
    }
    const result = await syncCategorizables(auth.supabase, id, body.shop_category_ids);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // ISR/CDN 캐시 즉시 무효화 — 인기 100명 prerender + revalidate=120 만으로는 한참 반영 안 됨
  revalidatePath(`/artists/${id}`);

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
