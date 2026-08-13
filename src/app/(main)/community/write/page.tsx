import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { STRINGS } from "@/lib/strings";
import { getUser } from "@/lib/supabase/auth";
import { PostWriteClient } from "./PostWriteClient";

export const metadata: Metadata = {
  title: STRINGS.community.writePost,
  robots: { index: false, follow: false },
};

export default async function Page(): Promise<React.ReactElement> {
  // 글쓰기는 회원만 — 비로그인은 로그인 후 이 페이지로 돌아온다.
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/community/write")}`);

  return <PostWriteClient />;
}
