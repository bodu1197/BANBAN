import "server-only";
import sharp from "sharp";

export const EVENT_IMAGE_BUCKET = "events";

export const EVENT_THUMBNAIL_RESIZE_PX = 480;
export const EVENT_WEBP_QUALITY = 80;

export const EVENT_THUMBNAIL_SIZE = "1024x1024" as const;
export const EVENT_SECTION_SIZE = "1024x1536" as const;

export const EVENT_CACHE_CONTROL = "public, immutable, max-age=31536000";

const MAX_BASE64_LENGTH = 20 * 1024 * 1024;
const BASE64_PATTERN = /^[A-Za-z0-9+/=]+$/;
const SHARP_INPUT_PIXEL_LIMIT = 1024 * 1024 * 16;

const MIN_WEBP_QUALITY = 1;
const MAX_WEBP_QUALITY = 100;

export class ImageDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageDecodeError";
  }
}

function decodeBase64(b64: string): Buffer {
  if (b64.length > MAX_BASE64_LENGTH) {
    throw new ImageDecodeError("base64 payload exceeds limit");
  }
  if (!BASE64_PATTERN.test(b64)) {
    throw new ImageDecodeError("base64 contains invalid characters");
  }
  try {
    return Buffer.from(b64, "base64");
  } catch {
    throw new ImageDecodeError("base64 decode failed");
  }
}

function clampQuality(value: number | undefined): number {
  if (value === undefined) return EVENT_WEBP_QUALITY;
  if (!Number.isFinite(value)) return EVENT_WEBP_QUALITY;
  return Math.min(MAX_WEBP_QUALITY, Math.max(MIN_WEBP_QUALITY, Math.round(value)));
}

export interface ProcessImageOptions {
  width?: number;
  height?: number;
  quality?: number;
}

export async function processBase64ToWebp(
  b64: string,
  options: ProcessImageOptions = {},
): Promise<Buffer> {
  const buffer = decodeBase64(b64);
  const pipeline = sharp(buffer, { failOn: "error", limitInputPixels: SHARP_INPUT_PIXEL_LIMIT });
  if (options.width || options.height) {
    pipeline.resize(options.width, options.height);
  }
  return pipeline.webp({ quality: clampQuality(options.quality) }).toBuffer();
}

export function buildEventImagePath(
  artistId: string,
  timestamp: number,
  suffix: string,
): string {
  return `${artistId}/${timestamp}_${suffix}.webp`;
}

const PROMPT_MAX_LENGTH = 200;
const CONTROL_CHAR_PATTERN = new RegExp(
  "[\\u0000-\\u001f\\u007f\\u200b-\\u200f\\u2028-\\u202e\\u2066-\\u2069]",
  "g",
);
const QUOTE_PATTERN = /["`\\]/g;
const WHITESPACE_PATTERN = /\s+/g;

export function sanitizePromptValue(input: unknown, maxLength: number = PROMPT_MAX_LENGTH): string {
  if (typeof input !== "string") return "";
  return input
    .replace(CONTROL_CHAR_PATTERN, " ")
    .replace(QUOTE_PATTERN, "")
    .replace(WHITESPACE_PATTERN, " ")
    .trim()
    .slice(0, maxLength);
}
