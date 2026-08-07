import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPostById } from "@/lib/supabase/community-queries";
import { getUser } from "@/lib/supabase/auth";
import { recordPostView } from "@/lib/actions/community";
import { fetchGuestIps } from "@/lib/guest-auth";
import { isCurrentUserAdmin } from "@/lib/supabase/is-current-user-admin";
import { buildPageSeo } from "@/lib/seo";
import { PostDetailClient } from "./PostDetailClient";

// 관리자에게만 작성 IP 를 실어 보내므로 응답을 공유 캐시에 담으면 안 된다.
// (지금도 getUser() 의 쿠키 접근으로 동적이지만, 그 암묵적 조건에 기대지 않는다.)
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await fetchPostById(id);
  if (!post) return { title: "게시글을 찾을 수 없습니다" };

  const description = post.content.slice(0, 120);
  // 제목 상한이 200자라 그대로 넣으면 <title>·og:title 이 통째로 잘려 보인다.
  const title = post.title.length > 70 ? `${post.title.slice(0, 69)}…` : post.title;
  return {
    title,
    description,
    ...buildPageSeo({ title, description, path: `/community/${id}`, type: "article" }),
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

  const isAdmin = user ? await isCurrentUserAdmin() : false;
  // 작성 IP 는 관리자에게만 넘긴다 — 일반 사용자 응답에는 아예 실리지 않는다.
  // 게스트가 쓴 글·댓글만 조회한다(회원 글은 guest_authors 에 행이 없다).
  const guestIps = isAdmin
    ? await fetchGuestIps(
        post.isGuest ? id : null,
        post.comments.filter((c) => c.isGuest).map((c) => c.id),
      )
    : {};

  return (
    <PostDetailClient
      post={post}
      userId={user?.id ?? null}
      isAdmin={isAdmin}
      guestIps={guestIps}
    />
  );
}
