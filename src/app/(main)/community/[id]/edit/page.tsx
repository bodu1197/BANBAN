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
  if (!user) redirect(`/login?next=${encodeURIComponent(`/community/${id}/edit`)}`);
  if (user.id !== post.authorId && !(await isCurrentUserAdmin())) redirect(`/community/${id}`);

  return (
    <PostEditClient
      postId={post.id}
      initialTitle={post.title}
      initialContent={post.content}
      initialImageUrl={post.imageUrl ?? ""}
      initialYoutubeUrl={post.youtubeUrl ?? ""}
    />
  );
}
