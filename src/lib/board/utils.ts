const CHARS_PER_MINUTE = 300;
const EXCERPT_MAX_LENGTH = 150;
const META_DESC_MAX_LENGTH = 160;
const MARKDOWN_STRIP = /[#*!\[\]()]/g;

export function estimateReadingTime(content: string): number {
  const len = content.replace(/\s+/g, " ").trim().length;
  return Math.max(1, Math.ceil(len / CHARS_PER_MINUTE));
}

export function stripMarkdown(content: string): string {
  return content.replace(MARKDOWN_STRIP, "");
}

export function generateExcerpt(content: string): string {
  return stripMarkdown(content).slice(0, EXCERPT_MAX_LENGTH).trim();
}

export function generateMetaDescription(content: string): string {
  return stripMarkdown(content).slice(0, META_DESC_MAX_LENGTH).trim();
}
