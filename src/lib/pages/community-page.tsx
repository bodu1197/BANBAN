import "server-only";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { MessageSquare, Eye, Heart, PenSquare, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { STRINGS } from "@/lib/strings";
import { getAlternates } from "@/lib/seo";
import { boardLabel } from "@/lib/board/constants";
import type { CommunityPost, PostSortType } from "@/lib/supabase/community-queries";
import type { ReviewWithArtist, ReviewComment } from "@/lib/supabase/queries";
import { ReviewComments } from "@/components/community/ReviewComments";
import { formatRelativeTime } from "@/lib/utils/format-time";
import type { BoardListItem } from "@/lib/board/queries";

const t = STRINGS.community;

export type CommunityTabKey = "shop-in-shop" | "qna" | "reviews" | "beautylab";

export const COMMUNITY_TABS: ReadonlyArray<{ key: CommunityTabKey; label: string }> = [
  { key: "shop-in-shop", label: t.shopInShop },
  { key: "qna", label: t.qna },
  { key: "reviews", label: t.review },
  { key: "beautylab", label: t.beautyLab },
];

const SORT_OPTIONS: ReadonlyArray<{ key: PostSortType; label: string }> = [
  { key: "latest", label: t.latest },
  { key: "popular", label: t.popular },
];

// 탭/정렬 검증 단일소스 — page.tsx 가 searchParams 를 안전하게 해석할 때 사용.
const VALID_TAB_KEYS = new Set<CommunityTabKey>(COMMUNITY_TABS.map((tab) => tab.key));
const VALID_SORTS = new Set<PostSortType>(SORT_OPTIONS.map((opt) => opt.key));

export function resolveCommunityTab(raw: string | undefined): CommunityTabKey {
  return raw && VALID_TAB_KEYS.has(raw as CommunityTabKey) ? (raw as CommunityTabKey) : "shop-in-shop";
}

export function resolveCommunitySort(raw: string | undefined): PostSortType {
  return raw && VALID_SORTS.has(raw as PostSortType) ? (raw as PostSortType) : "latest";
}

export function generateCommunityMetadata(): Metadata {
  return {
    title: t.title,
    description: `${t.title} — 샵인샵 임대·구인, 질문답변, 후기, 뷰티랩까지 반언니 회원 소통 공간`,
    alternates: getAlternates("/community"),
  };
}

function TabsNav({ activeTab }: Readonly<{ activeTab: CommunityTabKey }>): React.ReactElement {
  return (
    <nav className="flex border-b border-border" aria-label="커뮤니티 게시판">
      {COMMUNITY_TABS.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <Link
            key={tab.key}
            href={`/community?tab=${tab.key}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex-1 px-2 py-3 text-center text-sm font-medium transition-colors",
              "hover:text-brand-primary focus-visible:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "text-brand-primary after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-brand-primary"
                : "text-muted-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

function PostCard({ post }: Readonly<{ post: CommunityPost }>): React.ReactElement {
  return (
    <Link
      href={`/community/${post.id}`}
      className="block px-4 py-3.5 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="mb-1 flex items-center gap-1.5">
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {boardLabel(post.typeBoard)}
        </span>
        <h3 className="truncate text-sm font-semibold">{post.title}</h3>
      </div>
      <p className="line-clamp-1 text-xs text-muted-foreground">{post.content}</p>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span>{post.authorNickname ?? t.anonymous}</span>
        <span>{formatRelativeTime(post.createdAt)}</span>
        <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" aria-hidden="true" />{post.viewsCount}</span>
        <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" aria-hidden="true" />{post.likesCount}</span>
        <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" aria-hidden="true" />{post.commentsCount}</span>
      </div>
    </Link>
  );
}

function SortBar({ tab, currentSort }: Readonly<{
  tab: CommunityTabKey; currentSort: PostSortType;
}>): React.ReactElement {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex gap-2">
        {SORT_OPTIONS.map((opt) => (
          <Link
            key={opt.key}
            href={`/community?tab=${tab}&sort=${opt.key}`}
            aria-current={opt.key === currentSort ? "true" : undefined}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              "hover:bg-brand-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              opt.key === currentSort ? "bg-brand-primary text-white" : "bg-muted text-muted-foreground",
            )}
          >
            {opt.label}
          </Link>
        ))}
      </div>
      {/* 비회원에게도 노출 — 클릭 시 /community/write 가 로그인으로 유도(쓰기 권한은 로그인 필요). */}
      <Link
        href="/community/write"
        className="flex items-center gap-1 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <PenSquare className="h-3.5 w-3.5" aria-hidden="true" />
        {t.writePost}
      </Link>
    </div>
  );
}

function PostBoardSection({ posts, tab, sort }: Readonly<{
  posts: readonly CommunityPost[]; tab: CommunityTabKey; sort: PostSortType;
}>): React.ReactElement {
  return (
    <section aria-label={COMMUNITY_TABS.find((x) => x.key === tab)?.label ?? t.title}>
      <SortBar tab={tab} currentSort={sort} />
      {posts.length === 0 ? (
        <p className="py-20 text-center text-sm text-muted-foreground">{t.noPosts}</p>
      ) : (
        <ul className="divide-y divide-border">
          {posts.map((post) => (
            <li key={post.id}><PostCard post={post} /></li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ReviewCard({ review, comments, userId }: Readonly<{
  review: ReviewWithArtist;
  comments: readonly ReviewComment[];
  userId: string | null;
}>): React.ReactElement {
  const shop = review.artist;
  return (
    <article className="px-4 py-4">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-sm font-semibold">{review.profile?.nickname ?? review.profile?.username ?? "회원"}</span>
        <span className="flex items-center gap-0.5 text-xs font-medium text-brand-primary">
          <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          {review.rating.toFixed(1)}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {review.created_at ? formatRelativeTime(review.created_at) : ""}
        </span>
      </div>
      <p className="mb-2 line-clamp-4 text-sm leading-relaxed text-foreground">{review.content}</p>
      {shop ? (
        <Link
          href={`/artists/${shop.id}?tab=reviews`}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {shop.title}에서 더 보기 →
        </Link>
      ) : null}
      <ReviewComments reviewId={review.id} comments={comments} userId={userId} />
    </article>
  );
}

function ReviewsSection({ reviews, commentsByReview, userId }: Readonly<{
  reviews: readonly ReviewWithArtist[];
  commentsByReview: ReadonlyMap<string, ReviewComment[]>;
  userId: string | null;
}>): React.ReactElement {
  if (!userId) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="mb-3 text-sm text-muted-foreground">로그인한 회원만 후기를 볼 수 있습니다.</p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-lg bg-brand-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          로그인하고 후기 보기
        </Link>
      </div>
    );
  }
  if (reviews.length === 0) {
    return <p className="py-20 text-center text-sm text-muted-foreground">아직 등록된 후기가 없습니다.</p>;
  }
  return (
    <section aria-label={t.review} className="divide-y divide-border">
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          comments={commentsByReview.get(review.id) ?? []}
          userId={userId}
        />
      ))}
    </section>
  );
}

function BeautyLabCard({ article }: Readonly<{ article: BoardListItem }>): React.ReactElement {
  return (
    <Link
      href={`/encyclopedia/${article.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-[16/9] w-full bg-muted">
        {article.cover_image_url ? (
          <Image
            src={article.cover_image_url}
            alt={article.title}
            fill
            className="object-cover"
            sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 240px"
            unoptimized
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <span className="mb-1 w-fit rounded bg-brand-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-primary">
          {article.category}
        </span>
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground">{article.title}</h3>
        <span className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Eye className="h-3 w-3" aria-hidden="true" />
          {article.view_count.toLocaleString()}
        </span>
      </div>
    </Link>
  );
}

function BeautyLabSection({ articles }: Readonly<{ articles: readonly BoardListItem[] }>): React.ReactElement {
  if (articles.length === 0) {
    return <p className="py-20 text-center text-sm text-muted-foreground">준비 중입니다.</p>;
  }
  return (
    <section aria-label={t.beautyLab} className="grid grid-cols-2 gap-3 px-4 py-4 md:grid-cols-3 lg:grid-cols-4">
      {articles.map((article) => (
        <BeautyLabCard key={article.id} article={article} />
      ))}
    </section>
  );
}

interface HubProps {
  activeTab: CommunityTabKey;
  posts: readonly CommunityPost[];
  reviews: readonly ReviewWithArtist[];
  commentsByReview: ReadonlyMap<string, ReviewComment[]>;
  articles: readonly BoardListItem[];
  sort: PostSortType;
  userId: string | null;
}

function CommunityTabContent({
  activeTab,
  posts,
  reviews,
  commentsByReview,
  articles,
  sort,
  userId,
}: Readonly<HubProps>): React.ReactElement {
  if (activeTab === "reviews") {
    return <ReviewsSection reviews={reviews} commentsByReview={commentsByReview} userId={userId} />;
  }
  if (activeTab === "beautylab") return <BeautyLabSection articles={articles} />;
  return <PostBoardSection posts={posts} tab={activeTab} sort={sort} />;
}

export function renderCommunityHub(props: Readonly<HubProps>): React.ReactElement {
  return (
    <div className="mx-auto w-full max-w-[1024px]">
      <TabsNav activeTab={props.activeTab} />
      <CommunityTabContent {...props} />
    </div>
  );
}
