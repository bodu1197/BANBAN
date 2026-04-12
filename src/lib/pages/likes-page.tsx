import { Heart } from "lucide-react";
import { STRINGS } from "@/lib/strings";
import { getUser } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";
import { fetchLikedArtists } from "@/lib/actions/likes";
import { LikesContent } from "@/app/(main)/likes/LikesContent";

export async function renderLikesPage(): Promise<React.ReactElement> {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const likedArtists = await fetchLikedArtists();

  return (
    <main className="mx-auto flex flex-1 w-full max-w-[767px] flex-col px-4 py-6">
      <h1 className="text-2xl font-bold">
        <Heart className="mr-2 inline-block h-6 w-6" />
        {STRINGS.mypage.likedPortfolios}
      </h1>
      <LikesContent
        artists={likedArtists}
        labels={{
          portfolios: STRINGS.mypage.likedPortfolios,
          artists: STRINGS.mypage.likedArtists,
          noData: STRINGS.common.noData,
        }}
      />
    </main>
  );
}
