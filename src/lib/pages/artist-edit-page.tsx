import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { fetchAllCategories } from "@/lib/supabase/queries";
import { resolveRegionByAddress } from "@/lib/regions-lookup";
import type { Database } from "@/types/database";
import { ArtistEditClient } from "@/app/(main)/mypage/artist/edit/ArtistEditClient";
import type { ArtistEditClientProps } from "@/app/(main)/mypage/artist/edit/ArtistEditClient";

export const artistEditMetadata: Metadata = {
  title: "마이숍 정보 수정",
  description: "마이숍 정보를 수정합니다.",
};

/** 주소로 지역을 찾아 폼 초기값으로 쓸 형태로 돌려준다. 못 찾으면 빈 값 유지(저장 시 안내 문구로 걸린다). */
async function backfillRegion(
  supabase: SupabaseClient<Database>,
  address: string,
): Promise<{ region_id: string; region: { id: string; name: string } } | Record<string, never>> {
  const region = await resolveRegionByAddress(supabase, address);
  return region ? { region_id: region.id, region } : {};
}

export async function renderArtistEditPage(): Promise<React.ReactElement> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch artist data
  const { data: artist } = await supabase
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
  const { data: categorizables } = await supabase
    .from("categorizables")
    .select("category_id")
    .eq("categorizable_type", "artist")
    .eq("categorizable_id", artist.id);

  const categoryIds = (categorizables ?? []).map((c: { category_id: string }) => c.category_id);

  const categories = await fetchAllCategories();

  // 지역이 비어 있는 샵(과거 regions 결손으로 못 붙은 경우)만 주소로 채워 넘긴다.
  // 이미 지역이 있으면 건드리지 않는다 — 열어보기만 해도 지역이 바뀌는 일을 막는다.
  const withRegion = artist.region_id
    ? artist
    : { ...artist, ...await backfillRegion(supabase, artist.address as string) };

  return (
    <ArtistEditClient
      artist={withRegion as unknown as ArtistEditClientProps["artist"]}
      categoryIds={categoryIds}
      categories={categories}
    />
  );
}
