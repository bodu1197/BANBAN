// @client-reason: Uses useState for expanded/collapsed state toggle
"use client";

import { useState, useMemo } from "react";
import { sanitizeHtmlServerSide } from "@/lib/text-utils";

interface CollapsibleIntroProps {
  text: string;
  htmlContent?: string | null;
  moreLabel: string;
  lessLabel: string;
}

// Maximum input length to prevent DoS attacks
const MAX_HTML_LENGTH = 50000;

/**
 * Check if attribute value contains a dangerous protocol (for removal)
 * Uses lowercase comparison to catch all variants
 */
function hasDangerousProtocol(value: string): boolean {
  return value.toLowerCase().startsWith("javascript");
}

/**
 * Sanitize HTML content to prevent XSS attacks
 * Uses DOM API on client-side (safest), falls back to string-based on server
 */
function sanitizeHtml(html: string): string {
  // Truncate to prevent DoS
  const truncated = html.length > MAX_HTML_LENGTH ? html.slice(0, MAX_HTML_LENGTH) : html;

  // Server-side: use shared sanitization utility
  if (typeof document === "undefined") {
    return sanitizeHtmlServerSide(truncated);
  }

  // Client-side: use DOM API (safest method)
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = truncated;

  // Remove script tags
  const scripts = tempDiv.querySelectorAll("script");
  scripts.forEach((s) => s.remove());

  // Remove event handlers and dangerous protocol URLs
  const allElements = tempDiv.querySelectorAll("*");
  allElements.forEach((el) => {
    const attrs = Array.from(el.attributes);
    attrs.forEach((attr) => {
      // SECURITY: Remove event handlers and dangerous URLs (detection for removal)
      if (attr.name.startsWith("on") || hasDangerousProtocol(attr.value)) {
        el.removeAttribute(attr.name);
      }
    });
  });

  // Remove img tags (hero banner already shows images)
  const images = tempDiv.querySelectorAll("img");
  images.forEach((img) => img.remove());

  return tempDiv.innerHTML;
}

export function CollapsibleIntro({
  text,
  htmlContent,
  moreLabel,
  lessLabel,
}: Readonly<CollapsibleIntroProps>): React.ReactElement {
  const [expanded, setExpanded] = useState(false);

  // Use HTML content if available, otherwise use plain text
  const hasHtmlContent = htmlContent?.includes("<");

  const sanitizedHtml = useMemo(() => {
    if (hasHtmlContent && htmlContent) {
      return sanitizeHtml(htmlContent);
    }
    return null;
  }, [hasHtmlContent, htmlContent]);

  return (
    <div className="border-y border-border/50 bg-background px-4 py-4">
      <div className="relative">
        {hasHtmlContent && sanitizedHtml ? (
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
