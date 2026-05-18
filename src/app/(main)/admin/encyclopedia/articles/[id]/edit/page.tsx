// admin 백과사전 글 수정 — AdminLayout 가드
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { EncyclopediaArticleForm, type ArticleFormInitial } from "@/components/admin/EncyclopediaArticleForm";

export const metadata: Metadata = {
  title: "백과사전 글 수정 (관리자)",
  robots: { index: false, follow: false },
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function AdminEncyclopediaEditPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>): Promise<React.ReactElement> {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) notFound();

  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types limitation
  const { data } = await (supabase as any)
    .from("encyclopedia_articles")
    .select("id, slug, title, category, excerpt, content, cover_image_url, cover_image_alt, inline_images, keywords, tags, meta_title, meta_description, published")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  return <EncyclopediaArticleForm mode="edit" initial={data as ArticleFormInitial} />;
}
