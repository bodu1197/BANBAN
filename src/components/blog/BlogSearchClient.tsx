// @client-reason: Interactive search/filter with debounced input, dynamic data fetching
"use client";

import type { BlogPost, BlogCategoryCount } from "@/lib/supabase/blog-queries";
import type { Region } from "@/types/database";
import BlogTypeTabs from "./BlogTypeTabs";
import BlogFilters from "./BlogFilters";
import BlogGrid from "./BlogGrid";
import { useBlogSearch } from "./useBlogSearch";

interface BlogSearchData {
  posts: BlogPost[];
  totalCount: number;
  categories: BlogCategoryCount[];
  regions: Region[];
}

export default function BlogSearchClient({ initial }: Readonly<{
    initial: BlogSearchData;
}>): React.ReactElement {
  const state = useBlogSearch(initial);

  return (
    <section>
      <BlogTypeTabs activeTab={state.tab} onTabChange={state.setTab} />
      <BlogFilters
        regions={state.regions}
        regionId={state.regionId}
        regionSido={state.regionSido}
        onRegionChange={state.setRegions}
      />
      <p className="px-4 pb-2 text-xs text-muted-foreground">{state.totalCount.toLocaleString()}개의 글</p>
      <BlogGrid posts={state.posts} />
      {state.loading ? (
        <p className="py-4 text-center text-xs text-muted-foreground">로딩 중...</p>
      ) : null}
    </section>
  );
}
