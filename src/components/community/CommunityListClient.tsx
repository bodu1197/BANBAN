// @client-reason: interactive tabs, sort selection, URL param navigation
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Plus, MessageCircle, User, FileText, Star, HelpCircle, Users, MessageSquare, Clock } from "lucide-react";
import type { CommunityPost } from "@/lib/supabase/community-queries";
import type { ReviewWithArtist } from "@/lib/supabase/queries";
import type { HomeRecruitment } from "@/lib/supabase/home-recruitment-queries";

interface Props {
  posts: CommunityPost[];
  reviews: ReviewWithArtist[];
  recruitments: HomeRecruitment[];
  labels: Record<string, string>;
  recruitmentLabels: Record<string, string>;
  }

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

function PostCard({ post, labels }: Readonly<{
  post: CommunityPost;
  labels: Record<string, string>;
  }>): React.ReactElement {
  const badgeClass = post.typeBoard === "QNA" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700";
  return (
    <Link
      href={`/community/${post.id}`}
      className="block rounded-xl border border-border p-4 transition-colors hover:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${badgeClass}`}>
          {post.typeBoard === "QNA" ? labels.qna : labels.freeTalk}
        </span>
        {post.typePost !== "GENERAL" && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {post.typePost === "TATTOO" ? labels.tattoo : labels.beauty}
          </span>
        )}
      </div>
      <h3 className="mb-1 text-sm font-semibold line-clamp-1">{post.title}</h3>
      <p className="mb-3 text-xs text-muted-foreground line-clamp-2">{post.content}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted">
            <User className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
          </div>
          <span className="text-xs text-muted-foreground">{post.authorNickname ?? labels.anonymous}</span>
          <span className="text-xs text-muted-foreground/60">·</span>
          <span className="text-xs text-muted-foreground/60">{formatTimeAgo(post.createdAt)}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3" aria-hidden="true" />{post.commentsCount}</span>
        </div>
      </div>
    </Link>
  );
}

function TabGroup({ tabs, current, onChange }: Readonly<{
  tabs: Array<{ key: string; label: string }>;
  current: string;
  onChange: (key: string) => void;
}>): React.ReactElement {
  return (
    <div className="mb-3 flex gap-1 rounded-lg bg-muted p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            current === tab.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground focus-visible:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function SortTabs({ tabs, current, onChange }: Readonly<{
  tabs: Array<{ key: string; label: string }>;
  current: string;
  onChange: (key: string) => void;
}>): React.ReactElement {
  return (
    <div className="flex gap-2 border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            current === tab.key
              ? "border-brand-primary text-brand-primary"
              : "border-transparent text-muted-foreground hover:text-foreground focus-visible:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function sortPosts(posts: CommunityPost[], sort: string): CommunityPost[] {
  return [...posts].sort((a, b) => {
    if (sort === "popular") return b.viewsCount - a.viewsCount;
    if (sort === "recommended") return b.likesCount - a.likesCount;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function CategoryButtonIcon({ isActive, icon: Icon, label, onClick }: Readonly<{
  isActive: boolean;
  icon: typeof Star;
  label: string;
  onClick: () => void;
}>): React.ReactElement {
  return (
    <button type="button" onClick={onClick} className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isActive ? "border-brand-primary bg-brand-primary/5 text-brand-primary" : "border-border hover:border-brand-primary"}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isActive ? "bg-brand-primary/10" : "bg-muted"}`}>
        <Icon className={`h-5 w-5 ${isActive ? "text-brand-primary" : "text-muted-foreground"}`} aria-hidden="true" />
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function CategoryIcons({ labels, currentBoard, onBoardChange }: Readonly<{
  labels: Record<string, string>;
  currentBoard: string;
  onBoardChange: (key: string) => void;
}>): React.ReactElement {
  return (
    <div className="mb-4 grid grid-cols-4 gap-2">
      <CategoryButtonIcon isActive={currentBoard === "REVIEW"} icon={Star} label={labels.review} onClick={() => onBoardChange(currentBoard === "REVIEW" ? "" : "REVIEW")} />
      <CategoryButtonIcon isActive={currentBoard === "QNA"} icon={HelpCircle} label={labels.qna} onClick={() => onBoardChange(currentBoard === "QNA" ? "" : "QNA")} />
      <CategoryButtonIcon isActive={currentBoard === "RECRUITMENT"} icon={Users} label={labels.recruitment} onClick={() => onBoardChange(currentBoard === "RECRUITMENT" ? "" : "RECRUITMENT")} />
      <CategoryButtonIcon isActive={currentBoard === "FREETALK"} icon={MessageSquare} label={labels.freeTalk} onClick={() => onBoardChange(currentBoard === "FREETALK" ? "" : "FREETALK")} />
    </div>
  );
}

function PostsList({ posts, labels}: Readonly<{
  posts: CommunityPost[];
  labels: Record<string, string>;
  }>): React.ReactElement {
  if (posts.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed">
        <FileText className="mb-3 h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
        <p className="text-muted-foreground">{labels.noPosts}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => <PostCard key={post.id} post={post} labels={labels} />)}
    </div>
  );
}

// === Review list (inline) ===

function ReviewStarRating({ rating }: Readonly<{ rating: number }>): React.ReactElement {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-zinc-300 dark:text-zinc-600"}`}
        />
      ))}
    </div>
  );
}

function getReviewContent(review: ReviewWithArtist): string {
  return review.content ?? "";
}

function resolveAvatarUrl(path: string | null | undefined, baseUrl: string): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${baseUrl}/${path}`;
}

function getArtistName(artist: ReviewWithArtist["artist"]): string {
  return artist?.title ?? artist?.profiles?.nickname ?? "아티스트";
}

function ReviewCard({ review, avatarBaseUrl }: Readonly<{ review: ReviewWithArtist; avatarBaseUrl: string }>): React.ReactElement {
  const date = new Date(review.created_at as string);
  const artistName = getArtistName(review.artist);
  const reviewerName = review.profile?.nickname ?? "익명";
  const content = getReviewContent(review);
  const artistId = review.artist_id;
  const avatarUrl = resolveAvatarUrl(review.artist?.profile_image_path, avatarBaseUrl);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/artists/${artistId}`}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted">
            {avatarUrl ? (
              <Image src={avatarUrl} alt={artistName} fill className="object-cover" sizes="36px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                {artistName.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-brand-primary hover:underline focus-visible:underline">
              {artistName}
            </span>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {reviewerName} · {date.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
            </p>
          </div>
        </Link>
        <ReviewStarRating rating={review.rating} />
      </div>
      {content ? (
        <p className="mt-2 text-sm leading-relaxed text-foreground">{content}</p>
      ) : null}
    </div>
  );
}

const AVATAR_BASE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars`;

function ReviewsList({ reviews}: Readonly<{
  reviews: ReviewWithArtist[];
  }>): React.ReactElement {
  if (reviews.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed">
        <MessageSquare className="mb-3 h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
        <p className="text-muted-foreground">리뷰가 없습니다</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {reviews.map(review => <ReviewCard key={review.id} review={review} avatarBaseUrl={AVATAR_BASE_URL} />)}
    </div>
  );
}

// === Recruitment list (inline) ===

function getDaysLeft(closedAt: string | null): number | null {
  if (!closedAt) return null;
  const diff = new Date(closedAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function RecruitmentItem({ item, recruitmentLabels }: Readonly<{
  item: HomeRecruitment;
  recruitmentLabels: Record<string, string>;
  }>): React.ReactElement {
  const daysLeft = getDaysLeft(item.closedAt);
  const isFree = item.expense === 0;

  return (
    <Link
      href={`/recruitment/${item.id}`}
      className="flex gap-3 rounded-xl border border-border p-4 transition-colors hover:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
        {item.artistProfileImage ? (
          <Image src={item.artistProfileImage} alt="" width={48} height={48} className="rounded-full object-cover" unoptimized />
        ) : (
          <User className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="mb-1 text-sm font-semibold line-clamp-1">{item.title}</h3>
        <p className="mb-1 text-xs text-muted-foreground">{item.artistName}</p>
        <div className="flex flex-wrap items-center gap-2">
          {item.parts ? <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{item.parts}</span> : null}
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${isFree ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
            {isFree ? recruitmentLabels.free : `${item.expense.toLocaleString()}원`}
          </span>
          {daysLeft !== null ? (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {recruitmentLabels.dDay.replace("{days}", String(daysLeft))}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function RecruitmentsList({ recruitments, recruitmentLabels}: Readonly<{
  recruitments: HomeRecruitment[];
  recruitmentLabels: Record<string, string>;
  }>): React.ReactElement {
  if (recruitments.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed">
        <Users className="mb-3 h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
        <p className="text-muted-foreground">{recruitmentLabels.noRecruitments}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {recruitments.map((r) => (
        <RecruitmentItem key={r.id} item={r} recruitmentLabels={recruitmentLabels} />
      ))}
    </div>
  );
}

// === Main component ===

export function CommunityListClient({ posts, reviews, recruitments, labels, recruitmentLabels}: Readonly<Props>): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentBoard = searchParams.get("board") ?? "";
  const currentCategory = searchParams.get("category") ?? "";
  const currentSort = searchParams.get("sort") ?? "latest";

  function navigate(params: Record<string, string>): void {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value) sp.set(key, value); else sp.delete(key);
    }
    router.push(`/community?${sp.toString()}`);
  }

  const filtered = posts.filter((p) => {
    if (currentBoard && currentBoard !== "REVIEW" && currentBoard !== "RECRUITMENT" && p.typeBoard !== currentBoard) return false;
    if (currentCategory && p.typePost !== currentCategory) return false;
    return true;
  });
  const sorted = sortPosts(filtered, currentSort);

  return (
    <div>
      <CategoryIcons labels={labels} currentBoard={currentBoard} onBoardChange={(key) => navigate({ board: key, category: "", sort: "" })} />
      <BoardContent
        currentBoard={currentBoard}
        reviews={reviews}
        recruitments={recruitments}
        recruitmentLabels={recruitmentLabels}
        sorted={sorted}
        labels={labels}
        currentCategory={currentCategory}
        currentSort={currentSort}
        onCategoryChange={(key) => navigate({ category: key })}
        onSortChange={(key) => navigate({ sort: key })}
      />
    </div>
  );
}


function WriteButton({ href, label }: Readonly<{ href: string; label: string }>): React.ReactElement {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={label}>
      <Plus className="h-4 w-4" aria-hidden="true" />{label}
    </Link>
  );
}

function BoardContent({ currentBoard, reviews, recruitments, recruitmentLabels, sorted, labels, currentCategory, currentSort, onCategoryChange, onSortChange }: Readonly<{
  currentBoard: string;
  reviews: ReviewWithArtist[];
  recruitments: HomeRecruitment[];
  recruitmentLabels: Record<string, string>;
    sorted: CommunityPost[];
  labels: Record<string, string>;
  currentCategory: string;
  currentSort: string;
  onCategoryChange: (key: string) => void;
  onSortChange: (key: string) => void;
}>): React.ReactElement {
  const isFreeTalk = currentBoard === "FREETALK";
  const showCategoryFilter = !isFreeTalk && currentBoard !== "REVIEW" && currentBoard !== "RECRUITMENT";

  if (currentBoard === "REVIEW") {
    return <ReviewsList reviews={reviews} />;
  }
  if (currentBoard === "RECRUITMENT") {
    return (
      <>
        <div className="mb-3 flex items-center justify-end">
          <WriteButton href={`/recruitment/create`} label={recruitmentLabels.createNew} />
        </div>
        <RecruitmentsList recruitments={recruitments} recruitmentLabels={recruitmentLabels} />
      </>
    );
  }

  const writeHref = currentBoard
    ? `/community/write?board=${currentBoard}`
    : `/community/write`;

  return (
    <>
      {showCategoryFilter && (
        <TabGroup tabs={[{ key: "", label: labels.allPosts }, { key: "TATTOO", label: labels.tattoo }, { key: "BEAUTY", label: labels.beauty }]} current={currentCategory} onChange={onCategoryChange} />
      )}
      <div className="mb-3 flex items-center justify-between">
        <SortTabs tabs={[{ key: "latest", label: labels.latest }, { key: "popular", label: labels.popular }, { key: "recommended", label: labels.recommended }]} current={currentSort} onChange={onSortChange} />
        <WriteButton href={writeHref} label={labels.writePost} />
      </div>
      <PostsList posts={sorted} labels={labels} />
    </>
  );
}
