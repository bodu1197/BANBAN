"use server";

import { revalidatePath } from "next/cache";

/**
 * 아티스트 수정 직후 호출 — /artists/[id] 의 ISR 캐시를 즉시 무효화.
 *
 * Why: `src/app/(main)/artists/[id]/page.tsx` 가 `revalidate = 120` + 인기 100명
 * `generateStaticParams` prerender 를 사용. 수동 invalidation 없으면 인기 아티스트는
 * 빌드 타임 정적 HTML 이 ISR/CDN 다층 캐시에 고착돼 수정 사항이 한참 반영 안 됨.
 *
 * How to apply: ArtistEditClient / admin artist edit 등 어디서든 artists.update 직후 호출.
 */
export async function revalidateArtistPage(artistId: string): Promise<void> {
  revalidatePath(`/artists/${artistId}`);
}
