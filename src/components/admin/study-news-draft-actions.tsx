// @client-reason: useActionState 로 승인/반려 진행상태·에러 표시(조용한 실패 방지)
"use client";

import { useActionState } from "react";
import { reviewStudyNews } from "@/lib/actions/study-news";

export function StudyNewsDraftActions({ slug }: Readonly<{ slug: string }>): React.ReactElement {
  const [state, action, pending] = useActionState(reviewStudyNews, null);
  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="slug" value={slug} />
      <div className="flex items-center gap-2">
        <button type="submit" name="intent" value="approve" disabled={pending} aria-busy={pending} className="inline-flex h-11 items-center justify-center rounded-full bg-brand-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
          {pending ? "처리 중…" : "승인·게시"}
        </button>
        <button type="submit" name="intent" value="reject" disabled={pending} aria-busy={pending} className="inline-flex h-11 items-center justify-center rounded-full border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
          {pending ? "처리 중…" : "반려"}
        </button>
      </div>
      {state?.error ? <p role="alert" className="mt-2 text-xs text-rose-600">{state.error}</p> : null}
    </form>
  );
}
