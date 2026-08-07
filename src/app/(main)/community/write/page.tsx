import type { Metadata } from "next";
import { STRINGS } from "@/lib/strings";
import { getUser } from "@/lib/supabase/auth";
import { PostWriteClient } from "./PostWriteClient";

export const metadata: Metadata = {
  title: STRINGS.community.writePost,
  robots: { index: false, follow: false },
};

export default async function Page(): Promise<React.ReactElement> {
  // 비로그인도 닉네임·비밀번호로 작성할 수 있다.
  const user = await getUser();

  return <PostWriteClient isGuest={!user} />;
}
