import type { GeneratedEventContent, GeneratedDetailCopy } from "@/components/event-form/types";

export function isDetailCopy(obj: unknown): obj is GeneratedDetailCopy {
  return obj !== null && typeof obj === "object" && "altTexts" in (obj as Record<string, unknown>);
}

export function isLegacyContent(obj: unknown): obj is GeneratedEventContent {
  return obj !== null && typeof obj === "object" && "headline" in (obj as Record<string, unknown>);
}
