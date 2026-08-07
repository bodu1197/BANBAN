// @client-reason: 부모 폼이 들고 있는 입력 상태를 그대로 받는 제어 컴포넌트
"use client";

import { STRINGS } from "@/lib/strings";
import { GUEST_NAME_MAX, GUEST_PASSWORD_MAX } from "@/lib/guest-limits";

const t = STRINGS.community;

const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** 비회원 작성자 표시 — 목록·상세가 같은 모양을 쓰도록 한 곳에서 정의한다. */
export function GuestBadge(): React.ReactElement {
  return (
    <span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
      {t.guestBadge}
    </span>
  );
}

/** 비로그인 작성 글의 비밀번호 입력 — 작성·수정 양쪽에서 쓴다. */
export function GuestPasswordField({
  id,
  value,
  placeholder,
  /** 새로 정하는 비밀번호(작성)인지, 이미 정해둔 걸 확인하는 것(수정·삭제)인지 */
  mode = "new",
  autoFocus = false,
  onChange,
  onEnter,
}: Readonly<{
  id: string;
  value: string;
  placeholder?: string;
  mode?: "new" | "verify";
  autoFocus?: boolean;
  onChange: (value: string) => void;
  onEnter?: () => void;
}>): React.ReactElement {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {t.guestPassword}
      </label>
      <input
        id={id}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) onEnter?.(); }}
        placeholder={placeholder ?? t.guestPasswordPlaceholder}
        maxLength={GUEST_PASSWORD_MAX}
        autoComplete={mode === "new" ? "new-password" : "current-password"}
        autoFocus={autoFocus}
        className={INPUT_CLASS}
      />
    </div>
  );
}

/** 비로그인 작성자용 닉네임 + 비밀번호 입력. 글쓰기·댓글 폼이 공유한다. */
export function GuestFields({
  idPrefix,
  name,
  password,
  onNameChange,
  onPasswordChange,
}: Readonly<{
  idPrefix: string;
  name: string;
  password: string;
  onNameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
}>): React.ReactElement {
  return (
    <div className="mb-4">
      <p className="mb-2 text-xs text-muted-foreground">{t.guestNotice}</p>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-guest-name`} className="mb-1.5 block text-sm font-medium">
            {t.guestName}
          </label>
          <input
            id={`${idPrefix}-guest-name`}
            type="text"
            value={name}
            // maxLength 는 UTF-16 단위라 이모지가 6자에서 막힌다 — 서버·DB 와 같은 코드포인트로 자른다.
            onChange={(e) => onNameChange([...e.target.value].slice(0, GUEST_NAME_MAX).join(""))}
            placeholder={t.guestNamePlaceholder}
            autoComplete="nickname"
            className={INPUT_CLASS}
          />
        </div>
        <GuestPasswordField
          id={`${idPrefix}-guest-password`}
          value={password}
          onChange={onPasswordChange}
        />
      </div>
    </div>
  );
}
