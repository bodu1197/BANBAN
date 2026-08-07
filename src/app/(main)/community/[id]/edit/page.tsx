import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { STRINGS } from "@/lib/strings";
import { fetchPostById } from "@/lib/supabase/community-queries";
import { getUser } from "@/lib/supabase/auth";
import { isCurrentUserAdmin } from "@/lib/supabase/is-current-user-admin";
import { PostEditClient } from "./PostEditClient";

export const metadata: Metadata = {
  title: STRINGS.community.edit,
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: Readonly<PageProps>): Promise<React.ReactElement> {
  const { id } = await params;
  const post = await fetchPostById(id);
  if (!post) notFound();

  const user = await getUser();
  const admin = user ? await isCurrentUserAdmin() : false;

  // 게스트 글은 누구나 폼을 열 수 있고(내용은 어차피 공개), 저장할 때 비밀번호로 막는다.
  if (!post.isGuest && !admin) {
    if (!user) redirect("/login");
    if (user.id !== post.authorId) redirect(`/community/${id}`);
  }

  return (
    <PostEditClient
      postId={post.id}
      initialTitle={post.title}
      initialContent={post.content}
      initialImageUrl={post.imageUrl ?? ""}
      initialYoutubeUrl={post.youtubeUrl ?? ""}
      requireGuestPassword={post.isGuest && !admin}
    />
  );
}
