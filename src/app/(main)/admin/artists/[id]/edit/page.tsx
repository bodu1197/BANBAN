// admin 전용 — 임의 아티스트 샵 정보 일괄 수정. AdminLayout 이 이미 is_admin 검증.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchAllCategories } from "@/lib/supabase/queries";
import { ArtistEditClient } from "@/app/(main)/mypage/artist/edit/ArtistEditClient";

export const metadata: Metadata = {
  title: "아티스트 샵 수정 (관리자)",
  description: "관리자 전용 아티스트 샵 정보 수정",
  robots: { index: false, follow: false },
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function fetchArtistById(supabase: SupabaseClient, artistId: string): Promise<unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase relation join not in generated types
  const { data } = await (supabase as any)
    .from("artists")
    .select(`
      *,
      artist_media(id, storage_path, type, order_index),
      region:regions(id, name)
    `)
    .eq("id", artistId)
    .is("deleted_at", null)
    .single();
  return data;
}

async function fetchArtistCategoryIds(supabase: SupabaseClient, artistId: string): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase type inference issue
  const { data } = await (supabase as any)
    .from("categorizables")
    .select("category_id")
    .eq("categorizable_type", "artist")
    .eq("categorizable_id", artistId);
  return ((data ?? []) as { category_id: string }[]).map((c) => c.category_id);
}

export default async function AdminArtistEditPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>): Promise<React.ReactElement> {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) notFound();

  // AdminLayout 이 이미 is_admin 검증 — 여기서는 admin client 로 RLS 우회 read 만.
  const supabase = createAdminClient();

  const [artist, categoryIds, categories] = await Promise.all([
    fetchArtistById(supabase, id),
    fetchArtistCategoryIds(supabase, id),
    fetchAllCategories(),
  ]);

  if (!artist) notFound();

  return (
    <ArtistEditClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ArtistData shape matches Supabase select
      artist={artist as any}
      categoryIds={categoryIds}
      categories={categories}
      isAdmin
    />
  );
}
