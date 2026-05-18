// 백과사전 글 수정 — admin 전용. slug 로 식별 (URL 일관성).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/supabase/is-current-user-admin";
import { createAdminClient } from "@/lib/supabase/server";
import { EncyclopediaArticleForm, type ArticleFormInitial } from "@/components/admin/EncyclopediaArticleForm";

export const metadata: Metadata = {
  title: "백과사전 글 수정",
  robots: { index: false, follow: false },
};

interface ArticleRow extends ArticleFormInitial {
  id: string;
}

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>): Promise<React.ReactElement> {
  const { slug } = await params;
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) notFound();

  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types limitation
  const { data } = await (supabase as any)
    .from("encyclopedia_articles")
    .select("id, slug, title, category, excerpt, content, cover_image_url, cover_image_alt, inline_images, keywords, tags, meta_title, meta_description, published")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) notFound();

  return <EncyclopediaArticleForm mode="edit" initial={data as ArticleRow} />;
}
