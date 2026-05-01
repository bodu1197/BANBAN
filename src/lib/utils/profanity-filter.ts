const PROFANITY_PATTERN = /시발|씨발|ㅅㅂ|ㅆㅂ|시bal|씨bal|개새끼|개세끼|ㄱㅅㄲ|병신|ㅂㅅ|byungsin|지랄|ㅈㄹ|좆|ㅈㅈ|닥쳐|닥치|꺼져|미친놈|미친년|ㅁㅊ|느금마|느금|엠창|쓰레기|한남|한녀|걸레|창녀|창남/gi;

export interface ProfanityCheckResult {
  hasProfanity: boolean;
  filtered: string;
  detectedWords: string[];
}

export function checkProfanity(text: string): ProfanityCheckResult {
  const detectedWords: string[] = [];
  const filtered = text.replace(PROFANITY_PATTERN, (match) => {
    detectedWords.push(match);
    return "*".repeat(match.length);
  });

  return {
    hasProfanity: detectedWords.length > 0,
    filtered,
    detectedWords,
  };
}

export function containsProfanity(text: string): boolean {
  PROFANITY_PATTERN.lastIndex = 0;
  return PROFANITY_PATTERN.test(text);
}
