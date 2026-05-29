import type { Metadata } from "next";
import {
  fetchCommunityPosts,
  type CommunityPost,
} from "@/lib/supabase/community-queries";
import { fetchAllReviews, type ReviewWithArtist } from "@/lib/supabase/queries";
import { getUser } from "@/lib/supabase/auth";
import {
  renderCommunityHub,
  generateCommunityMetadata,
  resolveCommunityTab,
  resolveCommunitySort,
} from "@/lib/pages/community-page";

export const revalidate = 30;

export function generateMetadata(): Metadata {
  return generateCommunityMetadata();
}

interface PageProps {
  searchParams: Promise<{ tab?: string; sort?: string }>;
}

export default async function Page({ searchParams }: Readonly<PageProps>): Promise<React.ReactElement> {
  const params = await searchParams;
  const activeTab = resolveCommunityTab(params.tab);
  const sort = resolveCommunitySort(params.sort);

  const user = await getUser();

  let posts: CommunityPost[] = [];
  let reviews: ReviewWithArtist[] = [];
  if (activeTab === "reviews") {
    reviews = (await fetchAllReviews({ limit: 20 })).data;
  } else if (activeTab !== "beautylab") {
    const typeBoard = activeTab === "qna" ? "QNA" : "SHOP_IN_SHOP";
    posts = await fetchCommunityPosts({ typeBoard, sort });
  }

  return renderCommunityHub({
    activeTab,
    posts,
    reviews,
    sort,
    userId: user?.id ?? null,
  });
}
