import type { Metadata } from "next";
import { getAlternates } from "@/lib/seo";
import { searchBlogPosts, fetchBlogCategories, fetchBlogRegions } from "@/lib/supabase/blog-queries";
import BlogSearchClient from "@/components/blog/BlogSearchClient";

const PER_PAGE = 5000;

export async function generateBlogMetadata(): Promise<Metadata> {
  const title = "타투 블로그 — 작품 해석과 트렌드";
  const description = "전문가의 시선으로 바라본 타투 작품 해석, 스타일 분석, 트렌드 가이드. 레터링, 미니타투, 이레즈미 등 다양한 타투 정보를 확인하세요.";

  return {
    title,
    description,
    alternates: getAlternates("/blog"),
    openGraph: { title, description, type: "website" },
  };
}

export async function renderBlogPage(): Promise<React.ReactElement> {
  const [{ data: posts, count }, categories, regions] = await Promise.all([
    searchBlogPosts({ typeArtist: "SEMI_PERMANENT", targetGender: "FEMALE", limit: PER_PAGE, offset: 0 }),
    fetchBlogCategories(),
    fetchBlogRegions(),
  ]);

  const pageTitle = "타투 블로그";

  return (
    <div className="mx-auto w-full max-w-[767px]">
      <header className="border-b border-border px-4 py-4">
        <h1 className="text-lg font-bold">{pageTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {`전문가의 시선으로 해석한 ${count.toLocaleString()}개의 타투 작품`}
        </p>
      </header>
      <BlogSearchClient
        initial={{ posts, totalCount: count, categories, regions }}
      />
    </div>
  );
}
