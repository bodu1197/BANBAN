export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function isSafePhone(phone: string): boolean {
  return /^[\d\-+() ]+$/.test(phone);
}

export function trackContactClick(artistId: string, clickType: "kakao" | "phone", sourcePage: string, sourceId: string): void {
  void fetch("/api/contact-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ artistId, clickType, sourcePage, sourceId }),
    keepalive: true,
  });
}
