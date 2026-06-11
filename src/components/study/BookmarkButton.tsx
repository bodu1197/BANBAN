// @client-reason: 북마크 토글 — Server Action 호출 + optimistic 상태
"use client";

import { useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { toggleStudyBookmark } from "@/lib/actions/study-progress";

export function BookmarkButton({ id, initialOn = false }: Readonly<{ id: string; initialOn?: boolean }>): React.ReactElement {
  const [on, setOn] = useState(initialOn);
  const [pending, startTransition] = useTransition();

  function handleToggle(): void {
    const next = !on;
    setOn(next); // optimistic
    startTransition(async () => {
      const res = await toggleStudyBookmark(id);
      if (res.success && typeof res.bookmarked === "boolean") setOn(res.bookmarked);
      else if (!res.success) setOn(!next); // 실패 시 롤백
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={pending}
      aria-busy={pending}
      aria-label={on ? "북마크 해제" : "북마크 추가"}
      aria-pressed={on}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        on ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-border text-muted-foreground hover:text-foreground focus-visible:text-foreground"
      }`}
    >
      <Bookmark className="h-[17px] w-[17px]" fill={on ? "currentColor" : "none"} aria-hidden="true" />
    </button>
  );
}
