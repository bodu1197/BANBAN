// @client-reason: tab/sort interaction, router push for filter changes
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Eye, Heart, PenSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { STRINGS } from "@/lib/strings";
import type { CommunityPost } from "@/lib/supabase/community-queries";

const t = STRINGS.community;

const BOARD_TABS = [
  { key: "ALL", label: t.allPosts },
  { key: "PROCEDURE_REVIEW", label: t.procedureReview },
  { key: "COURSE_REVIEW", label: t.courseReview },
] as const;

const SORT_OPTIONS = [
  { key: "latest", label: t.latest },
  { key: "popular", label: t.popular },
  { key: "recommended", label: t.recommended },
] as const;

const BOARD_LABEL_MAP: Record<string, string> = {
  PROCEDURE_REVIEW: t.procedureReview,
  COURSE_REVIEW: t.courseReview,
  QNA: t.qna,
  FREETALK: t.freeTalk,
  REVIEW: t.review,
};

function boardLabel(typeBoard: string): string {
  const record = BOARD_LABEL_MAP as Record<string, string>;
  // eslint-disable-next-line security/detect-object-injection -- typed Record lookup
  return record[typeBoard] ?? typeBoard;
}

interface CommunityListClientProps {
  posts: readonly CommunityPost[];
  currentBoard: string;
  currentSort: string;
  userId: string | null;
}

function BoardTabs({ currentBoard, onNavigate }: Readonly<{
  currentBoard: string; onNavigate: (board: string) => void;
}>): React.ReactElement {
  return (
    <nav className="flex border-b border-border" aria-label="게시판 카테고리">
      {BOARD_TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onNavigate(tab.key)}
          className={cn(
            "relative flex-1 px-2 py-3 text-center text-sm font-medium transition-colors",
            "hover:text-brand-primary focus-visible:text-brand-primary focus-visible:outline-none",
            currentBoard === tab.key
              ? "text-brand-primary after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-brand-primary"
              : "text-muted-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

function SortBar({ currentSort, onNavigate, userId }: Readonly<{
  currentSort: string; onNavigate: (sort: string) => void; userId: string | null;
}>): React.ReactElement {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex gap-2">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onNavigate(opt.key)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              "hover:bg-brand-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              currentSort === opt.key
                ? "bg-brand-primary text-white"
                : "bg-muted text-muted-foreground",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {userId ? (
        <Link
          href="/community/write"
          className="flex items-center gap-1 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PenSquare className="h-3.5 w-3.5" aria-hidden="true" />
          {t.writePost}
        </Link>
      ) : null}
    </div>
  );
}

export function CommunityListClient({
  posts,
  currentBoard,
  currentSort,
  userId,
}: Readonly<CommunityListClientProps>): React.ReactElement {
  const router = useRouter();

  function navigate(board: string, sort: string): void {
    const params = new URLSearchParams();
    if (board !== "ALL") params.set("board", board);
    if (sort !== "latest") params.set("sort", sort);
    const qs = params.toString();
    router.push(`/community${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="mx-auto w-full max-w-[767px]">
      <BoardTabs currentBoard={currentBoard} onNavigate={(board) => navigate(board, currentSort)} />
      <SortBar currentSort={currentSort} onNavigate={(sort) => navigate(currentBoard, sort)} userId={userId} />
      {posts.length === 0 ? (
        <p className="py-20 text-center text-sm text-muted-foreground">{t.noPosts}</p>
      ) : (
        <ul className="divide-y divide-border">
          {posts.map((post) => (
            <li key={post.id}><PostCard post={post} /></li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PostCard({ post }: Readonly<{ post: CommunityPost }>): React.ReactElement {
  return (
    <Link
      href={`/community/${post.id}`}
      className="block px-4 py-3.5 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {boardLabel(post.typeBoard)}
            </span>
            <h3 className="truncate text-sm font-semibold">{post.title}</h3>
          </div>
          <p className="line-clamp-1 text-xs text-muted-foreground">{post.content}</p>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span>{post.authorNickname ?? "익명"}</span>
        <span>{formatRelativeTime(post.createdAt)}</span>
        <span className="flex items-center gap-0.5">
          <Eye className="h-3 w-3" aria-hidden="true" />
          {post.viewsCount}
        </span>
        <span className="flex items-center gap-0.5">
          <Heart className="h-3 w-3" aria-hidden="true" />
          {post.likesCount}
        </span>
        <span className="flex items-center gap-0.5">
          <MessageSquare className="h-3 w-3" aria-hidden="true" />
          {post.commentsCount}
        </span>
      </div>
    </Link>
  );
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR");
}
