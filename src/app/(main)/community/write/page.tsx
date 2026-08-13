import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { STRINGS } from "@/lib/strings";
import { getUser } from "@/lib/supabase/auth";
import { boardFromTab } from "@/lib/board/constants";
import { PostWriteClient } from "./PostWriteClient";

export const metadata: Metadata = {
  title: STRINGS.community.writePost,
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function Page({ searchParams }: Readonly<PageProps>): Promise<React.ReactElement> {
  const { tab } = await searchParams;
  // 보고 있던 탭을 그대로 이어받는다 — 목록에서 이미 고른 게시판을 여기서 또 고르게 하지 않는다.
  const board = boardFromTab(tab);

  // 글쓰기는 회원만 — 로그인 후 고르던 게시판 그대로 이 페이지로 돌아온다.
  const user = await getUser();
  if (!user) {
    const back = `/community/write?tab=${tab === "qna" ? "qna" : "shop-in-shop"}`;
    redirect(`/login?next=${encodeURIComponent(back)}`);
  }

  return <PostWriteClient board={board} />;
}
