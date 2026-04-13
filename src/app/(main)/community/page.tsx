import type { Metadata } from "next";
import { STRINGS } from "@/lib/strings";
import { getAlternates } from "@/lib/seo";
import { fetchCommunityPosts, type PostBoardType, type PostSortType } from "@/lib/supabase/community-queries";
import { getUser } from "@/lib/supabase/auth";
import { CommunityListClient } from "./CommunityListClient";

export const revalidate = 30;

const t = STRINGS.community;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: t.title,
    description: `${t.title} - 자유롭게 소통하는 반언니 게시판`,
    alternates: getAlternates("/community"),
  };
}

interface PageProps {
  searchParams: Promise<{ board?: string; sort?: string }>;
}

export default async function Page({ searchParams }: Readonly<PageProps>): Promise<React.ReactElement> {
  const params = await searchParams;
  const board = (params.board as PostBoardType) || undefined;
  const sort = (params.sort as PostSortType) || "latest";

  const [posts, user] = await Promise.all([
    fetchCommunityPosts({ typeBoard: board, sort }),
    getUser(),
  ]);

  return (
    <CommunityListClient
      posts={posts}
      currentBoard={board ?? "ALL"}
      currentSort={sort}
      userId={user?.id ?? null}
    />
  );
}
