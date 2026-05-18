// @client-reason: confirm dialog + fetch DELETE + router.push — 모두 클라이언트 상호작용.
// ISR 캐시 안전을 위해 mount 후 admin 여부 확인 (server-side 렌더링 시 cached HTML 노출 차단).
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

export function AdminArticleActions({ articleId, slug, title }: Readonly<Props>): React.ReactElement | null {
  const isAdmin = useIsCurrentUserAdmin();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  if (!isAdmin) return null;

  const handleDelete = async (): Promise<void> => {
    if (!globalThis.confirm(`"${title}" 글을 삭제합니다. 되돌릴 수 없습니다.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/encyclopedia/articles/${articleId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
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
        // 터치 타겟 ≥40px + 색 대비 보강 (text-red-700 + bg-red-500/15) — WCAG AA.
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
        {busy ? "삭제중..." : "삭제"}
      </button>
    </div>
  );
}
