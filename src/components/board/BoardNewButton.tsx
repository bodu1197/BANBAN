// @client-reason: ISR 캐시 안전 — mount 후 클라이언트에서 admin 여부 판단
"use client";

import Link from "next/link";
import { PenSquare } from "lucide-react";
import { useIsCurrentUserAdmin } from "@/hooks/useIsCurrentUserAdmin";

export function BoardNewButton(): React.ReactElement | null {
  const isAdmin = useIsCurrentUserAdmin();
  if (!isAdmin) return null;

  return (
    <Link
      href="/encyclopedia/new"
      aria-label="새 글 작성"
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-2.5 text-xs font-semibold text-brand-primary-foreground transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <PenSquare className="h-3.5 w-3.5" aria-hidden="true" />
      새 글 작성
    </Link>
  );
}
