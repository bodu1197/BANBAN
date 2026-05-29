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
import { fetchBoardList, type BoardListItem } from "@/lib/board/queries";
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
  let articles: BoardListItem[] = [];
  if (activeTab === "reviews") {
    // 후기는 로그인 회원만 열람 — 비로그인 시 페칭하지 않음(ReviewsSection 이 로그인 안내).
    if (user) {
      reviews = (await fetchAllReviews({ limit: 20 })).data;
      commentsByReview = await fetchReviewCommentsByReviewIds(reviews.map((r) => r.id));
    }
  } else if (activeTab === "beautylab") {
    // 뷰티랩 = 백과사전 글을 커뮤니티 안에서 바로 카드로 노출(클릭 시 /encyclopedia/[slug] 에서 읽기).
    articles = (await fetchBoardList({ limit: 30 })).items;
  } else {
    const typeBoard = activeTab === "qna" ? "QNA" : "SHOP_IN_SHOP";
    posts = await fetchCommunityPosts({ typeBoard, sort });
  }

  return renderCommunityHub({
    activeTab,
    posts,
    reviews,
    commentsByReview,
    articles,
    sort,
    userId: user?.id ?? null,
  });
}
