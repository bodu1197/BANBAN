import Link from "next/link";
import Image from "next/image";
import type { BoardListItem } from "@/lib/board/queries";

/** 백과사전 글 카드 — /encyclopedia 리스트와 커뮤니티 뷰티랩 탭이 공유(동일 디자인 보장). */

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

export function ArticleCard({ item }: Readonly<{ item: BoardListItem }>): React.ReactElement {
  return (
    <Link
      href={`/encyclopedia/${item.slug}`}
      className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="w-full overflow-hidden rounded-xl bg-muted">
        {item.cover_image_url ? (
          <Image
            src={item.cover_image_url}
            alt={item.title}
            width={1200}
            height={630}
            className="h-auto w-full transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <div className="flex aspect-[40/21] w-full items-center justify-center text-sm text-muted-foreground">
            {item.category}
          </div>
        )}
      </div>
      <div className="mt-3 px-0.5">
        <h2 className="line-clamp-2 text-[15px] font-bold leading-snug text-foreground md:text-base">
          {item.title}
        </h2>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground md:text-sm">
          {item.category}
        </p>
        <time className="mt-2 block text-xs text-muted-foreground" dateTime={item.published_at}>
          {formatDate(item.published_at)}
        </time>
      </div>
    </Link>
  );
}
