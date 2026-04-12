// @client-reason: Part of client-side blog search UI
"use client";

import type { BlogPost } from "@/lib/supabase/blog-queries";
import BlogCard from "./BlogCard";

export default function BlogGrid({ posts}: Readonly<{
  posts: BlogPost[];
  }>): React.ReactElement {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">검색 결과가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {posts.map((post) => (
        <BlogCard key={post.id} post={post} />
      ))}
    </div>
  );
}
