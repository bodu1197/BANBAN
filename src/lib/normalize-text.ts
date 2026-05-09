function decodeHtmlEntities(text: string): string {
  return text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCodePoint(parseInt(hex as string, 16)),
  );
}

/**
 * 인스타그램 꾸미기 폰트(Mathematical Italic 등)를 일반 문자로 변환.
 * HTML 엔티티 디코딩 → NFKC 정규화. 한글/이모지는 그대로 유지.
 */
export function normalizeFancyText(text: string): string {
  const decoded = text.includes("&#x") ? decodeHtmlEntities(text) : text;
  return decoded.normalize("NFKC");
}
