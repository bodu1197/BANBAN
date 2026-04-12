import Link from "next/link";
import Image from "next/image";
import type { BlogPost } from "@/lib/supabase/blog-queries";

export default function BlogCard({ post }: Readonly<{ post: BlogPost }>): React.ReactElement {
  const title = post.title;
  const meta = post.meta_description ?? "";
  const date = new Date(post.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block overflow-hidden rounded-xl border border-border transition-colors hover:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {post.image_url ? (
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          <Image
            src={post.image_url}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105 group-focus-visible:scale-105"
            sizes="(max-width: 767px) 50vw, 360px"
            unoptimized
          />
        </div>
      ) : null}
      <div className="p-4">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {post.category_name ? (
            <span className="rounded bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary">{post.category_name}</span>
          ) : null}
          {post.artist_name ? (
            <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{post.artist_name}</span>
          ) : null}
        </div>
        <h2 className="mb-1.5 text-base font-bold leading-snug line-clamp-2">{title}</h2>
        <p className="mb-2 text-xs leading-relaxed text-muted-foreground line-clamp-2">{meta}</p>
        <time className="text-xs text-muted-foreground/60" dateTime={post.created_at}>{date}</time>
      </div>
    </Link>
  );
}
