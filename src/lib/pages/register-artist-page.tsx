import { fetchAllCategories } from "@/lib/supabase/queries";
import { ArtistRegisterClient } from "@/app/(main)/register/artist/ArtistRegisterClient";

export async function renderRegisterArtistPage(): Promise<React.ReactElement> {
  const categories = await fetchAllCategories();

  return <ArtistRegisterClient categories={categories} />;
}
