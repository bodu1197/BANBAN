/**
 * 설명 텍스트 렌더링 유틸리티
 *
 * Uses `sanitize-html` (pure-JS Node-native sanitizer).
 *
 * Why not isomorphic-dompurify? It depends on jsdom, which in turn requires
 * @exodus/bytes/encoding-lite.js — that module ships only as ESM and Vercel's
 * server runtime tries to `require()` it, causing ERR_REQUIRE_ESM 500s on
 * every portfolio detail page (logged 2026-04-08). sanitize-html has no DOM
 * dependency and works the same on server and client.
 */

import sanitizeHtml from "sanitize-html";

const MAX_INPUT_LENGTH = 50_000;

/**
 * Allow-list of safe tags. Anything not on this list (including
 * script/style/iframe/object/embed/link/meta/form/input/img) is stripped.
 * sanitize-html drops disallowed tags AND their event-handler attributes
 * by default, so we don't need a separate FORBID list.
 */
const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "a",
  "ul", "ol", "li",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "code", "pre",
  "span", "div",
];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "target", "rel"],
    "*": ["class"],
  },
  // Only http(s)/mailto/tel — blocks javascript:, data:, vbscript:.
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href"],
  // Force safe rel on every <a target=_blank>.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow" }, true),
  },
  // Drop the entire content of these (default already does scripts/styles,
  // but be explicit so future maintainers see the intent).
  nonTextTags: ["script", "style", "textarea", "noscript"],
};

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function applyBoldFormatting(text: string): string {
  let result = text;
  let pos = result.indexOf("*");

  while (pos !== -1) {
    const closePos = result.indexOf("*", pos + 1);
    if (closePos === -1) break;

    const content = result.slice(pos + 1, closePos);
    if (content.length === 0 || content.includes("\n")) {
      pos = result.indexOf("*", pos + 1);
    } else {
      const before = result.slice(0, pos);
      const after = result.slice(closePos + 1);
      result = `${before}<strong>${content}</strong>${after}`;
      pos = result.indexOf("*", pos + content.length + 17);
    }
  }

  return result;
}

function sanitize(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

function sanitizeHtmlContent(html: string | null | undefined): string {
  if (!html) return "";

  const truncated = html.length > MAX_INPUT_LENGTH ? html.slice(0, MAX_INPUT_LENGTH) : html;

  // 이미 HTML 태그가 포함된 경우 HTML로 처리
  if (truncated.includes("<")) {
    return sanitize(truncated);
  }

  // 일반 텍스트인 경우: 이스케이프 → *bold* → 줄바꿈
  const escaped = escapeHtml(truncated);
  const withBold = applyBoldFormatting(escaped);
  return withBold.replaceAll("\n", "<br />");
}

export function parseDescriptionText(text: string | null | undefined): string {
  return sanitizeHtmlContent(text);
}

export function sanitizeHtmlServerSide(html: string, maxLength = MAX_INPUT_LENGTH): string {
  const truncated = html.length > maxLength ? html.slice(0, maxLength) : html;
  return sanitize(truncated);
}
