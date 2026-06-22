// @client-reason: Uses useState for expanded/collapsed state toggle
"use client";

import { useState } from "react";

interface CollapsibleIntroProps {
  text: string;
  /** Server-sanitized HTML string. Server pre-sanitize 후 그대로 dangerouslySetInnerHTML. */
  sanitizedHtml?: string | null;
  moreLabel: string;
  lessLabel: string;
}

export function CollapsibleIntro({
  text,
  sanitizedHtml,
  moreLabel,
  lessLabel,
}: Readonly<CollapsibleIntroProps>): React.ReactElement | null {
  const [expanded, setExpanded] = useState(false);
  // 태그를 제거한 실제 보이는 텍스트가 있을 때만 HTML 렌더 — "<p></p>"·"<p>   </p>" 같은
  // 시각적 공백 HTML(레거시 description)이 truthy 로 새어 빈 블록이 그려지는 것을 막는다.
  const hasHtml = sanitizedHtml && sanitizedHtml.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim().length > 0;
  // 보일 내용이 전혀 없으면(공백 HTML + 빈 평문) 빈 블록과 동작 없는 '더보기' 버튼만 남으므로 렌더 생략.
  if (!hasHtml && text.trim().length === 0) return null;

  return (
    <div className="border-y border-border/50 bg-background px-4 py-4">
      <div className="relative">
        {hasHtml ? (
          <div
            className={`prose prose-sm max-w-none text-foreground ${expanded ? "" : "line-clamp-3"}`}
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        ) : (
          <p
            className={`whitespace-pre-wrap text-sm text-foreground ${expanded ? "" : "line-clamp-3"}`}
          >
            {text}
          </p>
        )}
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="mt-2 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? lessLabel : moreLabel}
        </button>
      </div>
    </div>
  );
}
