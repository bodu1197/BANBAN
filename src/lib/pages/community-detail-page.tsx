import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { STRINGS } from "@/lib/strings";
import { fetchPostById } from "@/lib/supabase/community-queries";
import { getUser } from "@/lib/supabase/auth";
import { recordPostView } from "@/lib/actions/community";
import { CommunityDetailClient } from "@/components/community/CommunityDetailClient";
import { createStaticClient } from "@/lib/supabase/server";
import { getAlternates, getBreadcrumbJsonLd } from "@/lib/seo";

export async function generateCommunityDetailMetadata(postId: string): Promise<Metadata> {
  const post = await fetchPostById(postId);
  if (!post) return { title: "Not Found" };

  const description = post.content.slice(0, 160);
  return {
    title: post.title,
    description,
    alternates: getAlternates(`/community/${postId}`),
    openGraph: {
      title: post.title,
      description,
      type: "article",
    },
    twitter: {
      card: "summary",
      title: post.title,
      description,
    },
  };
}

export async function renderCommunityDetailPage(postId: string): Promise<React.ReactElement> {
  const [post, user] = await Promise.all([
    fetchPostById(postId),
    getUser().catch(() => null),
  ]);

  if (!post) notFound();

  // Record view (logged-in by user_id, anonymous by IP)
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
  recordPostView(postId, ip).catch(() => {});

  // Check if user liked this post + admin status
  let isLiked = false;
  let userIsAdmin = false;
  if (user) {
    const supabase = createStaticClient();
    const [likeResult, profileResult] = await Promise.all([
      supabase.from("likes").select("id").eq("user_id", user.id).eq("likeable_type", "post").eq("likeable_id", postId).maybeSingle(),
      supabase.from("profiles").select("is_admin").eq("id", user.id).single(),
    ]);
    isLiked = !!likeResult.data;
    userIsAdmin = (profileResult.data as { is_admin: boolean } | null)?.is_admin === true;
  }

  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", path: "" },
    { name: "커뮤니티", path: "/community" },
    { name: post.title, path: `/community/${postId}` },
  ]);

  return (
    <main className="mx-auto w-full max-w-[767px] px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <CommunityDetailClient
        post={post}
        isLiked={isLiked}
        userId={user?.id ?? null}
        isAdmin={userIsAdmin}
        labels={STRINGS.community}
      />
    </main>
  );
}
