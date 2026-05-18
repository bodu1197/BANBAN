// 백과사전 새 글 작성 — admin 전용. 공개 게시판 안에 위치하지만 비admin 은 404.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/supabase/is-current-user-admin";
import { EncyclopediaArticleForm } from "@/components/admin/EncyclopediaArticleForm";

export const metadata: Metadata = {
  title: "백과사전 새 글 작성",
  robots: { index: false, follow: false },
};

export default async function Page(): Promise<React.ReactElement> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) notFound();

  return <EncyclopediaArticleForm mode="create" />;
}
