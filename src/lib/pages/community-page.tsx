import type { Metadata } from "next";
import { STRINGS } from "@/lib/strings";
import { getAlternates } from "@/lib/seo";
import { fetchCommunityPosts } from "@/lib/supabase/community-queries";
import { fetchAllReviews, type ReviewWithArtist } from "@/lib/supabase/queries";
import { fetchRecruitments } from "@/lib/supabase/home-recruitment-queries";
import type { HomeRecruitment } from "@/lib/supabase/home-recruitment-queries";
import { CommunityListClient } from "@/components/community/CommunityListClient";

export type { ReviewWithArtist };
export type { HomeRecruitment };

export async function generateCommunityMetadata(): Promise<Metadata> {
  return {
    title: STRINGS.community.title,
    description: STRINGS.community.title,
    alternates: getAlternates("/community"),
  };
}

export async function renderCommunityPage(): Promise<React.ReactElement> {
  const [posts, { data: reviews }, recruitments] = await Promise.all([
    fetchCommunityPosts({ limit: 50 }),
    fetchAllReviews({ limit: 50 }),
    fetchRecruitments({ limit: 50 }),
  ]);

  return (
    <main className="mx-auto w-full max-w-[767px] px-4 py-6">
      <CommunityListClient
        posts={posts}
        reviews={reviews}
        recruitments={recruitments}
        labels={STRINGS.community}
        recruitmentLabels={STRINGS.recruitment}
      />
    </main>
  );
}
