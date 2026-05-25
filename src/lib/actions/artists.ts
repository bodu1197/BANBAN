"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * 아티스트 수정 직후 호출 — /artists/[id] 의 ISR 캐시를 즉시 무효화.
 *
 * Why: `src/app/(main)/artists/[id]/page.tsx` 가 `revalidate = 120` + 인기 100명
 * `generateStaticParams` prerender 를 사용. 수동 invalidation 없으면 인기 아티스트는
 * 빌드 타임 정적 HTML 이 ISR/CDN 다층 캐시에 고착돼 수정 사항이 한참 반영 안 됨.
 *
 * Security: 인증된 사용자가 본인 아티스트 또는 admin 인 경우에만 호출 가능.
 * 인증 없으면 누구나 임의 artistId 로 ISR 캐시 thrashing(DoS) 유발 가능.
 *
 * How to apply: ArtistEditClient 등 artists.update 직후 호출 (admin route 는 자체적으로 revalidatePath 호출).
 */
export async function revalidateArtistPage(artistId: string): Promise<void> {
  // 1. UUID 형식 검증 — 임의 문자열로 인한 cache key 폭증 방지
  if (typeof artistId !== "string" || !UUID_REGEX.test(artistId)) {
    throw new Error("Invalid artist id");
  }

  // 2. 인증된 사용자만
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  // 3. 본인 아티스트이거나 admin 이어야 함. 존재하지 않는 artistId 는 throw — 임의 ID 로 revalidate 호출 방지.
  const supabase = await createClient();
  const [{ data: profile }, { data: artist }] = await Promise.all([
    supabase.from("profiles").select("is_admin").eq("id", user.id).single(),
    supabase.from("artists").select("user_id").eq("id", artistId).single(),
  ]);
  if (!artist) throw new Error("Artist not found");
  const isAdmin = (profile as { is_admin?: boolean } | null)?.is_admin === true;
  const isOwner = (artist as { user_id?: string } | null)?.user_id === user.id;
  if (!isAdmin && !isOwner) throw new Error("Forbidden");

  revalidatePath(`/artists/${artistId}`);
}
