import type { Metadata } from "next";
import {
  fetchCommunityPosts,
  type CommunityPost,
} from "@/lib/supabase/community-queries";
import {
  fetchAllReviews,
  fetchReviewCommentsByReviewIds,
  type ReviewWithArtist,
  type ReviewComment,
} from "@/lib/supabase/queries";
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
  let commentsByReview: Map<string, ReviewComment[]> = new Map();
  if (activeTab === "reviews") {
    reviews = (await fetchAllReviews({ limit: 20 })).data;
    commentsByReview = await fetchReviewCommentsByReviewIds(reviews.map((r) => r.id));
  } else if (activeTab !== "beautylab") {
    const typeBoard = activeTab === "qna" ? "QNA" : "SHOP_IN_SHOP";
    posts = await fetchCommunityPosts({ typeBoard, sort });
  }

  return renderCommunityHub({
    activeTab,
    posts,
    reviews,
    commentsByReview,
    sort,
    userId: user?.id ?? null,
  });
}
