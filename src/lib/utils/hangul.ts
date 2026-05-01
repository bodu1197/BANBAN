const CHO = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"] as const;
const SYLLABLE_BASE = 0xAC00;
const SYLLABLE_PERIOD = 21 * 28;

function isChoseong(ch: string): boolean {
  return CHO.includes(ch as typeof CHO[number]);
}

function getChoseong(ch: string): string {
  const code = ch.charCodeAt(0);
  if (code < SYLLABLE_BASE || code > 0xD7A3) return ch;
  return CHO[Math.floor((code - SYLLABLE_BASE) / SYLLABLE_PERIOD)] as string;
}

export function isChoseongQuery(query: string): boolean {
  return query.length > 0 && [...query].every((ch) => isChoseong(ch) || /\s/.test(ch));
}

export function matchesChoseong(target: string, query: string): boolean {
  const targetCho = [...target].map(getChoseong).join("");
  return targetCho.includes(query);
}

export function buildChoseongRegex(query: string): string {
  const parts = [...query].map((ch) => {
    const idx = CHO.indexOf(ch as typeof CHO[number]);
    if (idx < 0) return ch;
    const start = String.fromCharCode(SYLLABLE_BASE + idx * SYLLABLE_PERIOD);
    const end = String.fromCharCode(SYLLABLE_BASE + (idx + 1) * SYLLABLE_PERIOD - 1);
    return `[${start}-${end}]`;
  });
  return parts.join("");
}
