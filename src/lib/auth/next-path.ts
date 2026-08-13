/**
 * 로그인 후 돌아갈 경로 검증 — **내부 경로만** 허용한다.
 * 서버(auth 콜백·auth 페이지)와 클라이언트(로그인 폼)가 같은 규칙을 쓴다.
 *
 * 🔴 `"/" 로 시작하는지` 만 보면 뚫린다. 브라우저는 URL 을 읽기 전에
 *    제어문자(TAB·CR·LF)를 지우고 역슬래시를 "/" 로 바꾸므로,
 *    `/\evil.com` 과 `/<TAB>/evil.com` 이 `//evil.com`(프로토콜 상대 URL)이 되어 외부로 나간다.
 *    그래서 같은 정규화를 먼저 한 뒤 판정한다.
 */
export function sanitizeNext(param: string | null | undefined): string {
  const next = (param ?? "/")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replaceAll("\\", "/");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
