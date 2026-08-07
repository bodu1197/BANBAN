// @client-reason: 모달 열림 상태와 비밀번호 입력 상태를 다룬다
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { STRINGS } from "@/lib/strings";
import { Button } from "@/components/ui/button";
import { GuestPasswordField } from "./GuestFields";
import { GUEST_PASSWORD_MIN } from "@/lib/guest-limits";

const t = STRINGS.community;

/** Tab 이 모달 밖으로 새지 않게 순환시킨다. */
function trapTab(e: KeyboardEvent, dialog: HTMLElement): void {
  const focusable = dialog.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
  );
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = globalThis.document.activeElement;

  // 포커스가 모달 밖이면 되돌린다(배경 클릭 등으로 새어나간 경우).
  if (!dialog.contains(active)) { e.preventDefault(); first.focus(); return; }
  if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
}

/**
 * 비회원 글·댓글의 수정/삭제 전 비밀번호 확인 모달.
 *
 * `prompt()` 를 쓰지 않는 이유: 비밀번호가 평문으로 보이고,
 * 카카오톡 등 인앱 브라우저에서는 아예 차단돼 작성자가 자기 글을 지울 수 없다.
 */
export function GuestPasswordDialog({
  title,
  confirmLabel,
  isPending,
  onCancel,
  onConfirm,
}: Readonly<{
  title: string;
  confirmLabel: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: (password: string) => void;
}>): React.ReactElement {
  const [password, setPassword] = useState("");
  // 같은 화면에 댓글이 여러 개라도 id 가 겹치지 않게 한다(label-input 연결이 깨진다).
  const uid = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const canConfirm = password.length >= GUEST_PASSWORD_MIN && !isPending;

  // 리스너를 매 렌더 다시 붙이지 않도록 최신 값만 ref 로 들고 간다.
  const latest = useRef({ onCancel, isPending });
  useEffect(() => { latest.current = { onCancel, isPending }; }, [onCancel, isPending]);

  // ESC 로 닫기 + 포커스를 모달 안에 가둔다 + 닫히면 원래 버튼으로 포커스 복귀.
  useEffect(() => {
    const opener = globalThis.document.activeElement as HTMLElement | null;

    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        if (!latest.current.isPending) latest.current.onCancel(); // 저장 중에는 닫지 않는다
        return;
      }
      if (e.key === "Tab" && dialogRef.current) trapTab(e, dialogRef.current);
    }

    globalThis.document.addEventListener("keydown", onKeyDown);
    return () => {
      globalThis.document.removeEventListener("keydown", onKeyDown);
      opener?.focus?.();
    };
  }, []);

  function submit(): void {
    if (canConfirm) onConfirm(password);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${uid}-title`}
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4"
    >
      {/* 배경 클릭으로 닫기 — Tab 순환 대상에서는 빼서(포커스 트랩) 키보드로는 취소 버튼을 쓰게 한다 */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={() => { if (!isPending) onCancel(); }}
        className="absolute inset-0 bg-black/60"
      />
      <div ref={dialogRef} className="relative w-full max-w-sm rounded-t-2xl bg-background p-5 shadow-xl md:rounded-2xl">
        <h2 id={`${uid}-title`} className="mb-1 text-base font-bold">
          {title}
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">{t.guestPasswordPrompt}</p>

        <div className="mb-4">
          <GuestPasswordField
            id={`${uid}-password`}
            value={password}
            mode="verify"
            autoFocus
            onChange={setPassword}
            onEnter={submit}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
            {STRINGS.common.cancel}
          </Button>
          <Button size="sm" onClick={submit} disabled={!canConfirm}>
            {isPending ? STRINGS.common.saving : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
