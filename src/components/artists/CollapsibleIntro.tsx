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
}: Readonly<CollapsibleIntroProps>): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const hasHtml = sanitizedHtml && sanitizedHtml.length > 0;

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
          className="mt-2 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? lessLabel : moreLabel}
        </button>
      </div>
    </div>
  );
}
