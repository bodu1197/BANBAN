/**
 * UUID 검증 한 곳.
 *
 * 서버액션·라우트핸들러의 인자는 타입이 아니라 **런타임에** 막아야 한다 — TypeScript 타입은
 * 컴파일 후 사라지므로 공개 POST 엔드포인트에는 아무 값이나 들어온다.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}
