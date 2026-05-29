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
} from "@/lib/pages/community-page";

export const revalidate = 30;

export function generateMetadata(): Metadata {
  return generateCommunityMetadata();
}

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function Page({ searchParams }: Readonly<PageProps>): Promise<React.ReactElement> {
  const params = await searchParams;
  const activeTab = resolveCommunityTab(params.tab);

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
    // 뷰티랩 = 백과사전 글을 커뮤니티 안에서 동일 카드(/encyclopedia 와 공유)로 노출.
    articles = (await fetchBoardList({ limit: 60 })).items;
  } else {
    const typeBoard = activeTab === "qna" ? "QNA" : "SHOP_IN_SHOP";
    posts = await fetchCommunityPosts({ typeBoard });
  }

  return renderCommunityHub({
    activeTab,
    posts,
    reviews,
    commentsByReview,
    articles,
    userId: user?.id ?? null,
  });
}
