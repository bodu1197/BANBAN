import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { STRINGS } from "@/lib/strings";
import { fetchPostById } from "@/lib/supabase/community-queries";
import { getUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { PostEditClient } from "./PostEditClient";

export const metadata: Metadata = {
  title: STRINGS.community.edit,
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: Readonly<PageProps>): Promise<React.ReactElement> {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect("/login");

  const post = await fetchPostById(id);
  if (!post) notFound();

  // Check ownership or admin
  const isOwner = user.id === post.authorId;
  if (!isOwner) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    const admin = (data as { is_admin: boolean } | null)?.is_admin === true;
    if (!admin) redirect(`/community/${id}`);
  }

  return (
    <PostEditClient
      postId={post.id}
      initialTitle={post.title}
      initialContent={post.content}
      initialBoard={post.typeBoard}
      initialImageUrl={post.imageUrl ?? ""}
      initialYoutubeUrl={post.youtubeUrl ?? ""}
    />
  );
}
