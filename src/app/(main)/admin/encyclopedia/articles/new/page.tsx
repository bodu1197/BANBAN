// admin 백과사전 새 글 작성 — AdminLayout 가드
import type { Metadata } from "next";
import { EncyclopediaArticleForm } from "@/components/admin/EncyclopediaArticleForm";

export const metadata: Metadata = {
  title: "백과사전 새 글 작성 (관리자)",
  robots: { index: false, follow: false },
};

export default function AdminEncyclopediaNewPage(): React.ReactElement {
  return <EncyclopediaArticleForm mode="create" />;
}
