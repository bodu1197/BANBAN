// @client-reason: 반려 사유 선택/입력 다이얼로그 — 선택·텍스트 입력·제출 상태 인터랙션
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

// 자주 쓰는 반려 사유(경우의 수). 선택분 + 추가 안내가 합쳐져 신청자에게 그대로 전달된다.
const PRESET_REASONS = [
  "대표 배너 또는 사진이 없거나 부적절합니다.",
  "포트폴리오(시술) 사진이 부족합니다.",
  "소개글이 비어 있거나 내용이 부실합니다.",
  "연락처(전화·카카오)가 누락되었거나 잘못되었습니다.",
  "주소·위치 정보가 부정확합니다.",
  "허위·과장 정보 또는 타 업체 도용이 의심됩니다.",
  "부적절하거나 금지된 콘텐츠가 포함되어 있습니다.",
  "사업자 정보 또는 자격 확인이 필요합니다.",
] as const;

const MAX_REASON_LEN = 500; // API(reject) 상한과 동일

function buildReason(selected: readonly string[], note: string): string {
  const parts: string[] = [];
  if (selected.length > 0) parts.push(selected.map((s) => `• ${s}`).join("\n"));
  const trimmed = note.trim();
  if (trimmed) parts.push(selected.length > 0 ? `추가 안내: ${trimmed}` : trimmed);
  return parts.join("\n");
}

export interface RejectTarget {
  id: string;
  title: string;
}

function ReasonChips({ selected, onToggle }: Readonly<{ selected: string[]; onToggle: (r: string) => void }>): React.ReactElement {
  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-1.5 text-xs font-semibold text-zinc-400">자주 쓰는 사유 (복수 선택 가능)</legend>
      <div className="flex flex-wrap gap-2">
        {PRESET_REASONS.map((r) => {
          const on = selected.includes(r);
          return (
            <button
              key={r}
              type="button"
              onClick={() => onToggle(r)}
              aria-pressed={on}
              className={`rounded-full border px-3 py-1.5 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                on
                  ? "border-brand-primary bg-brand-primary/20 text-white"
                  : "border-white/15 text-zinc-300 hover:border-white/35 hover:text-white focus-visible:border-white/35 focus-visible:text-white"
              }`}
            >
              {r}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ReasonNote({ note, onChange, charCount, overLimit }: Readonly<{
  note: string; onChange: (v: string) => void; charCount: number; overLimit: boolean;
}>): React.ReactElement {
  return (
    <div>
      <label htmlFor="reject-note" className="mb-1 block text-xs font-semibold text-zinc-400">추가 안내 (선택)</label>
      <textarea
        id="reject-note"
        value={note}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="구체적인 개선 방법을 적어주면 신청자가 빠르게 보완할 수 있어요."
        className="w-full resize-none rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <p className={`mt-1 text-right text-[11px] tabular-nums ${overLimit ? "text-red-400" : "text-zinc-500"}`}>{charCount}/{MAX_REASON_LEN}</p>
    </div>
  );
}

function RejectActions({ submitting, canSubmit, onCancel, onSubmit, submitLabel, submitAccent }: Readonly<{
  submitting: boolean; canSubmit: boolean; onCancel: () => void; onSubmit: () => void; submitLabel: string;
  submitAccent: "red" | "amber";
}>): React.ReactElement {
  // 반려=red(부정/삭제), 비공개(테이크다운)=amber(일시 숨김·복구 가능) — 큐의 '숨김' 버튼 색과 일치.
  const accent = submitAccent === "amber"
    ? "bg-amber-500 hover:bg-amber-600 focus-visible:bg-amber-600"
    : "bg-red-500 hover:bg-red-600 focus-visible:bg-red-600";
  return (
    <DialogFooter>
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="inline-flex h-10 items-center justify-center rounded-lg border border-white/15 px-4 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:bg-white/5 focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        취소
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className={`inline-flex h-10 items-center justify-center rounded-lg ${accent} px-4 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50`}
      >
        {submitting ? "처리 중…" : submitLabel}
      </button>
    </DialogFooter>
  );
}

// 안정 마운트 controlled 패턴(닫기 시 reset) — Radix Dialog 표준 사용.
// 반려/비공개(테이크다운) 공용 — heading/description/submitLabel 로 문구만 바꿔 재사용.
export function RejectShopModal({ shop, onClose, onConfirm, heading = "샵 반려", description, submitLabel = "반려하기", submitAccent = "red" }: Readonly<{
  shop: RejectTarget | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<boolean>;
  heading?: string;
  description?: string;
  submitLabel?: string;
  submitAccent?: "red" | "amber";
}>): React.ReactElement {
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reason = buildReason(selected, note);
  const overLimit = reason.length > MAX_REASON_LEN;
  const canSubmit = reason.trim().length > 0 && !overLimit && !submitting;

  function reset(): void {
    setSelected([]);
    setNote("");
    setError(null);
    setSubmitting(false);
  }

  function close(): void {
    reset();
    onClose();
  }

  // 안정 마운트 controlled 패턴 — Esc/백드롭 닫기 시 호출(제출 중엔 무시).
  function handleOpenChange(open: boolean): void {
    if (!open && !submitting) close();
  }

  function toggle(r: string): void {
    setSelected((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  async function submit(): Promise<void> {
    if (!reason.trim()) {
      setError("사유를 1개 이상 선택하거나 직접 입력해주세요.");
      return;
    }
    if (overLimit) {
      setError(`사유가 너무 깁니다. (${MAX_REASON_LEN}자 이하)`);
      return;
    }
    setSubmitting(true);
    setError(null);
    let ok = false;
    try {
      ok = await onConfirm(reason);
    } catch {
      // 네트워크 오류 등으로 onConfirm 이 reject → 버튼 고착 방지(submitting 해제 후 복구)
      setSubmitting(false);
      setError("네트워크 오류로 처리에 실패했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    if (ok) { close(); return; }
    setSubmitting(false);
    setError("처리에 실패했습니다. 이미 처리되었을 수 있습니다.");
  }

  return (
    <Dialog open={shop !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-zinc-900 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">{shop ? `'${shop.title}' ${heading}` : heading}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {description ?? "해당하는 사유를 선택하거나 직접 작성하세요. 선택한 내용은 운영자에게 그대로 전달되어 샵 개선에 사용됩니다."}
          </DialogDescription>
        </DialogHeader>

        <ReasonChips selected={selected} onToggle={toggle} />
        <ReasonNote note={note} onChange={setNote} charCount={reason.length} overLimit={overLimit} />

        {error ? <p role="alert" className="text-xs text-red-400">{error}</p> : null}

        <RejectActions submitting={submitting} canSubmit={canSubmit} onCancel={close} onSubmit={() => void submit()} submitLabel={submitLabel} submitAccent={submitAccent} />
      </DialogContent>
    </Dialog>
  );
}
