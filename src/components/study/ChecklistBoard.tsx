// @client-reason: 체크 토글 optimistic(Server Action) + 암기모드/reveal(세션 UI 상태)
"use client";

import { useState, useTransition } from "react";
import { Check, RotateCcw } from "lucide-react";
import { CHECKLIST, type ChecklistGroup } from "@/data/study/checklist";
import { toggleStudyChecklistItem, resetStudyChecklist } from "@/lib/actions/study-progress";
import { studyFilterChip } from "@/components/study/study-styles";

export function ChecklistBoard({ initialChecked }: Readonly<{ initialChecked: Record<string, boolean> }>): React.ReactElement {
  const [checked, setChecked] = useState(initialChecked);
  const [memorize, setMemorize] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();

  const total = CHECKLIST.reduce((s, g) => s + g.steps.length, 0);
  const doneCount = CHECKLIST.flatMap((g) => g.steps.map((_, i) => Boolean(checked[`${g.key}-${i}`]))).filter(Boolean).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  function toggle(itemKey: string): void {
    const next = !checked[itemKey];
    setChecked((c) => ({ ...c, [itemKey]: next })); // optimistic
    startTransition(async () => {
      const res = await toggleStudyChecklistItem(itemKey, next);
      if (!res.success) setChecked((c) => ({ ...c, [itemKey]: !next })); // 롤백
    });
  }

  function reset(): void {
    const prev = checked;
    setChecked({});
    setRevealed({});
    startTransition(async () => {
      const res = await resetStudyChecklist();
      if (!res.success) setChecked(prev); // 롤백
    });
  }

  function reveal(key: string): void {
    setRevealed((r) => ({ ...r, [key]: true }));
  }

  return (
    <div className="py-5">
      <h1 className="mb-1 text-xl font-bold">실기 체크리스트</h1>
      <p className="mb-4 text-sm text-muted-foreground">위생 순서·기구 세팅을 단계별로 점검하세요.</p>

      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">전체 진행</span>
          <span className="tabular-nums text-muted-foreground">{doneCount}/{total} · {pct}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`전체 진행률 ${pct}%`}>
          <div className="h-full rounded-full bg-brand-primary" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setMemorize((m) => !m)} aria-pressed={memorize} className={studyFilterChip(memorize)}>암기 모드</button>
          <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-rose-300 hover:text-rose-600 focus-visible:border-rose-300 focus-visible:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> 초기화
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {CHECKLIST.map((g) => (
          <ChecklistGroupCard key={g.key} group={g} checked={checked} memorize={memorize} revealed={revealed} onToggle={toggle} onReveal={reveal} />
        ))}
      </div>
    </div>
  );
}

function ChecklistGroupCard({ group, checked, memorize, revealed, onToggle, onReveal }: Readonly<{
  group: ChecklistGroup; checked: Record<string, boolean>; memorize: boolean; revealed: Record<string, boolean>;
  onToggle: (key: string) => void; onReveal: (key: string) => void;
}>): React.ReactElement {
  const groupDone = group.steps.filter((_, i) => Boolean(checked[`${group.key}-${i}`])).length;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold">{group.title}</h2>
        <span className="text-xs tabular-nums text-muted-foreground">{groupDone}/{group.steps.length}</span>
      </div>
      <ul className="space-y-1">
        {group.steps.map((step, i) => {
          const key = `${group.key}-${i}`;
          const on = Boolean(checked[key]);
          const hidden = memorize && !on && !revealed[key];
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => (hidden ? onReveal(key) : onToggle(key))}
                aria-pressed={on}
                className="flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border ${on ? "border-brand-primary bg-brand-primary text-white" : "border-border"}`}>
                  {on ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                </span>
                <span className={`text-sm leading-relaxed ${on ? "text-muted-foreground line-through" : "text-foreground"}`}>{hidden ? "(탭하여 보기)" : step}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
