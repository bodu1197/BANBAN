/** 게스트(비로그인) 닉네임·비밀번호 규칙 — 서버 검증과 폼 입력이 같은 값을 쓴다. */
export const GUEST_NAME_MIN = 2;
export const GUEST_NAME_MAX = 12;
export const GUEST_PASSWORD_MIN = 4;
export const GUEST_PASSWORD_MAX = 20;

export interface GuestInput {
  name: string;
  password: string;
}

export const GUEST_NAME_RULE = `닉네임은 ${GUEST_NAME_MIN}~${GUEST_NAME_MAX}자로 입력해주세요`;
export const GUEST_PASSWORD_RULE = `비밀번호는 ${GUEST_PASSWORD_MIN}~${GUEST_PASSWORD_MAX}자로 입력해주세요`;

/**
 * 닉네임·비밀번호 형식 검사. 문제가 없으면 null.
 * 서버 액션 인자는 클라이언트가 아무 JSON 이나 보낼 수 있으므로 타입부터 확인한다.
 */
export function guestInputError(guest: GuestInput | undefined): string | null {
  if (typeof guest?.name !== "string") return GUEST_NAME_RULE;
  if (typeof guest.password !== "string") return GUEST_PASSWORD_RULE;
  // DB CHECK 는 char_length(코드포인트)라 JS 의 .length(UTF-16 단위)로 재면
  // 이모지 닉네임이 폼은 통과하고 저장에서만 튕긴다 → 같은 기준으로 센다.
  const name = guest.name.trim();
  const nameLength = [...name].length;
  if (nameLength < GUEST_NAME_MIN || nameLength > GUEST_NAME_MAX) return GUEST_NAME_RULE;
  if (guest.password.length < GUEST_PASSWORD_MIN || guest.password.length > GUEST_PASSWORD_MAX) {
    return GUEST_PASSWORD_RULE;
  }
  return null;
}

/** 폼 제출 버튼 활성화 조건 — 서버와 같은 규칙을 쓴다. */
export function isGuestReady(name: string, password: string): boolean {
  return guestInputError({ name, password }) === null;
}
