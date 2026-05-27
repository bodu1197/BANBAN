import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { updateEvent } from "@/lib/supabase/event-queries";
import { calcDiscountRate } from "@/lib/portfolio/helpers";
import { EVENT_FIELD_LIMITS } from "@/lib/event/constants";
import type { Database } from "@/types/database";

type EventUpdate = Database["public"]["Tables"]["events"]["Update"];

async function getArtistIdForUser(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  return data?.id ?? null;
}

async function verifyOwnership(eventId: string, artistId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("artist_id", artistId)
    .is("deleted_at", null)
    .maybeSingle();
  return data !== null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function strOrNull(v: unknown): string | null | undefined {
  if (typeof v !== "string") return undefined;
  return v.length > 0 ? v : null;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((item) => typeof item === "string");
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function checkArrayItemLengths(raw: unknown, max: number, label: string): string | null {
  if (!isStringArray(raw)) return null;
  for (const item of raw) {
    if (item.length > max) return `${label} 항목이 너무 깁니다`;
  }
  return null;
}

function validateLengths(body: Record<string, unknown>): string | null {
  const L = EVENT_FIELD_LIMITS;
  const checks: Array<[string, unknown, number]> = [
    ["procedure_name", body.procedure_name, L.procedure_name],
    ["title", body.title, L.title],
    ["procedure_summary", body.procedure_summary, L.procedure_summary],
    ["event_period_text", body.event_period_text, L.event_period_text],
    ["retouch_type", body.retouch_type, L.retouch_type],
    ["retouch_description", body.retouch_description, L.retouch_description],
    ["shop_name", body.shop_name, L.shop_name],
    ["shop_region", body.shop_region, L.shop_region],
    ["shop_business_hours", body.shop_business_hours, L.shop_business_hours],
    ["shop_parking", body.shop_parking, L.shop_parking],
    ["shop_booking_method", body.shop_booking_method, L.shop_booking_method],
    ["procedure_duration", body.procedure_duration, L.procedure_duration],
    ["maintenance_period", body.maintenance_period, L.maintenance_period],
    ["precautions", body.precautions, L.precautions],
    ["artist_introduction", body.artist_introduction, L.artist_introduction],
  ];
  for (const [name, val, max] of checks) {
    if (typeof val === "string" && val.length > max) {
      return `${name} 필드가 최대 길이(${String(max)}자)를 초과했습니다`;
    }
  }
  return checkArrayItemLengths(body.target_audience, L.target_audience_item, "추천 대상")
    ?? checkArrayItemLengths(body.procedure_advantages, L.procedure_advantages_item, "시술 장점");
}

function buildUpdatePayload(body: Record<string, unknown>): EventUpdate {
  const priceOrigin = Number(body.price_origin) || 0;
  const price = Number(body.price) || 0;
  const discount = priceOrigin > 0 && price > 0
    ? calcDiscountRate(price, priceOrigin)
    : undefined;

  return {
    procedure_name: str(body.procedure_name),
    title: str(body.title),
    price_origin: priceOrigin > 0 ? priceOrigin : undefined,
    price: price > 0 ? price : undefined,
    discount_rate: discount,
    retouch_type: str(body.retouch_type),
    retouch_description: str(body.retouch_description),
    event_period_text: str(body.event_period_text),
    event_start_at: strOrNull(body.event_start_at),
    event_end_at: strOrNull(body.event_end_at),
    procedure_summary: str(body.procedure_summary),
    target_audience: isStringArray(body.target_audience) ? body.target_audience : undefined,
    shop_name: str(body.shop_name),
    shop_region: str(body.shop_region),
    shop_business_hours: str(body.shop_business_hours),
    shop_parking: str(body.shop_parking),
    shop_booking_method: str(body.shop_booking_method),
    procedure_duration: str(body.procedure_duration),
    maintenance_period: str(body.maintenance_period),
    procedure_advantages: isStringArray(body.procedure_advantages) ? body.procedure_advantages : undefined,
    precautions: str(body.precautions),
    artist_introduction: str(body.artist_introduction),
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const artistId = await getArtistIdForUser(user.id);
    if (!artistId) {
      return NextResponse.json({ error: "아티스트 계정이 필요합니다" }, { status: 403 });
    }

    const { id } = await params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "유효하지 않은 이벤트 ID" }, { status: 400 });
    }
    const isOwner = await verifyOwnership(id, artistId);
    if (!isOwner) {
      return NextResponse.json({ error: "본인의 이벤트만 수정할 수 있습니다" }, { status: 403 });
    }

    const raw: unknown = await request.json();
    if (!isPlainObject(raw)) {
      return NextResponse.json({ error: "잘못된 요청 형식" }, { status: 400 });
    }
    const lengthError = validateLengths(raw);
    if (lengthError) {
      return NextResponse.json({ error: lengthError }, { status: 400 });
    }
    await updateEvent(id, buildUpdatePayload(raw));

    // ISR/unstable_cache 무효화 — 홈 + 상세 페이지 즉시 반영
    revalidateTag("events", { expire: 0 });
    revalidatePath("/");
    revalidatePath("/events");
    revalidatePath(`/events/${id}`);

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "이벤트 수정 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
