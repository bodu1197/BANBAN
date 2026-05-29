import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPostById } from "@/lib/supabase/community-queries";
import { getUser } from "@/lib/supabase/auth";
import { recordPostView } from "@/lib/actions/community";
import { getAlternates } from "@/lib/seo";
import { PostDetailClient } from "./PostDetailClient";

export const revalidate = 30;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await fetchPostById(id);
  if (!post) return { title: "게시글을 찾을 수 없습니다" };

  return {
    title: post.title,
    description: post.content.slice(0, 120),
    alternates: getAlternates(`/community/${id}`),
  };
}

export default async function Page({ params }: Readonly<PageProps>): Promise<React.ReactElement> {
  const { id } = await params;
  const [post, user] = await Promise.all([
    fetchPostById(id),
    getUser(),
  ]);

  if (!post) notFound();

  // Record view (fire and forget)
  recordPostView(id).catch(() => {});

  const isAdmin = await checkIsAdmin(user?.id ?? null);

  return (
    <PostDetailClient
      post={post}
      userId={user?.id ?? null}
      isAdmin={isAdmin}
    />
  );
}

async function checkIsAdmin(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();
  return (data as { is_admin: boolean } | null)?.is_admin === true;
}
