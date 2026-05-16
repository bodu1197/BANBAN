import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isHttpUrl } from "@/lib/url-utils";
import type { Database } from "@/types/database";

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
  description: string | null;
  lat: number | null;
  lon: number | null;
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

function validateRegisterBody(body: RegisterBody): string | null {
  return (
    validateRequiredStrings(body) ??
    validateOptionalUrls(body) ??
    validateCoordinates(body)
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

function buildArtistRow(userId: string, body: RegisterBody): Database["public"]["Tables"]["artists"]["Insert"] {
  return {
    user_id: userId,
    type_artist: body.type_artist,
    type_sex: body.type_sex,
    title: body.title,
    contact: body.contact,
    instagram_url: body.instagram_url,
    kakao_url: body.kakao_url,
    zipcode: body.zipcode,
    address: body.address,
    address_detail: body.address_detail,
    region_id: body.region_id,
    introduce: body.introduce,
    description: body.description,
    lat: body.lat,
    lon: body.lon,
    is_hide: false,
    likes_count: 0,
    views_count: 0,
    approved_at: new Date().toISOString(),
  };
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

  const { data: artist, error: insertError } = await admin
    .from("artists")
    .insert(buildArtistRow(auth.user.id, body))
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "already_registered" }, { status: 409 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
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
