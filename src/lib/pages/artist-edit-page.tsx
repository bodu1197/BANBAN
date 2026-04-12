import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAllCategories } from "@/lib/supabase/queries";
import { ArtistEditClient } from "@/app/(main)/mypage/artist/edit/ArtistEditClient";

export const artistEditMetadata: Metadata = {
  title: "아티스트 정보 수정",
  description: "아티스트 정보를 수정합니다.",
};

export async function renderArtistEditPage(): Promise<React.ReactElement> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch artist data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase type inference issue
  const { data: artist } = await (supabase as any)
    .from("artists")
    .select(`
      *,
      artist_media(id, storage_path, type, order_index),
      region:regions(id, name)
    `)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!artist) {
    redirect("/register/artist");
  }

  // Fetch artist's categories
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase type inference issue
  const { data: categorizables } = await (supabase as any)
    .from("categorizables")
    .select("category_id")
    .eq("categorizable_type", "artist")
    .eq("categorizable_id", artist.id);

  const categoryIds = (categorizables ?? []).map((c: { category_id: string }) => c.category_id);

  const categories = await fetchAllCategories();

  return (
    <ArtistEditClient
      artist={artist}
      categoryIds={categoryIds}
      categories={categories}
    />
  );
}
