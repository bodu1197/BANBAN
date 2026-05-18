// @client-reason: confirm dialog + fetch DELETE + router.push
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { useIsCurrentUserAdmin } from "@/hooks/useIsCurrentUserAdmin";

interface Props {
  articleId: string;
  slug: string;
  title: string;
}

export function BoardAdminActions({ articleId, slug, title }: Readonly<Props>): React.ReactElement | null {
  const isAdmin = useIsCurrentUserAdmin();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  if (!isAdmin) return null;

  const handleDelete = async (): Promise<void> => {
    if (!globalThis.confirm(`"${title}" 글을 삭제합니다. 되돌릴 수 없습니다.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/board/articles/${articleId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        globalThis.alert(`삭제 실패: ${err.error ?? "알 수 없음"}`);
        return;
      }
      startTransition(() => {
        router.push("/encyclopedia");
        router.refresh();
      });
    } finally {
      setDeleting(false);
    }
  };

  const busy = deleting || isPending;

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/encyclopedia/${encodeURIComponent(slug)}/edit`}
        aria-label="글 수정"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        수정
      </Link>
      <button
        type="button"
        onClick={() => void handleDelete()}
        disabled={busy}
        aria-label="글 삭제"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden="true" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
        {busy ? "삭제중..." : "삭제"}
      </button>
    </div>
  );
}
