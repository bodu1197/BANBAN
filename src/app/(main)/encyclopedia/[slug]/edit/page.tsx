import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/supabase/is-current-user-admin";
import { createAdminClient } from "@/lib/supabase/server";
import { BoardForm, type BoardFormInitial } from "@/components/board/BoardForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "글 수정",
  robots: { index: false, follow: false },
};

interface ArticleRow extends BoardFormInitial {
  id: string;
}

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>): Promise<React.ReactElement> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    redirect(`/login?next=${encodeURIComponent(`/encyclopedia/${rawSlug}/edit`)}`);
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("encyclopedia_articles")
    .select("id, slug, title, category, content, cover_image_url, cover_image_alt, inline_images, published")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) notFound();

  return <BoardForm mode="edit" initial={data as ArticleRow} />;
}
