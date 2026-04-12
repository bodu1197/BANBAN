// @client-reason: form with state management for creating recruitment
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createRecruitment } from "@/lib/actions/recruitment-actions";

interface Props {
  labels: Record<string, string>;
  }

const BODY_PART_KEYS = [
  "bodyPartArm", "bodyPartLeg", "bodyPartBack", "bodyPartChest", "bodyPartShoulder",
  "bodyPartWrist", "bodyPartAnkle", "bodyPartNeck", "bodyPartRib", "bodyPartThigh", "bodyPartOther",
] as const;
const INPUT_CLASS = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ACTIVE_CLASS = "border-brand-primary bg-brand-primary/10 text-brand-primary";

function BodyPartChips({ value, onChange, labels }: Readonly<{
  value: string;
  onChange: (v: string) => void;
  labels: Record<string, string>;
}>): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-2">
      {BODY_PART_KEYS.map((key) => {
        // eslint-disable-next-line security/detect-object-injection -- key is from a static const array
        const label = labels[key] ?? key;
        return (
          <button key={key} type="button" onClick={() => onChange(label)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              value === label ? ACTIVE_CLASS : "border-border hover:border-brand-primary"
            }`}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ExpenseField({ isFree, setIsFree, expense, setExpense, labels }: Readonly<{
  isFree: boolean; setIsFree: (v: boolean) => void;
  expense: string; setExpense: (v: string) => void;
  labels: Record<string, string>;
}>): React.ReactElement {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{labels.expense}</label>
      <div className="mb-2 flex gap-2">
        <button type="button" onClick={() => setIsFree(true)}
          className={`rounded-lg border px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isFree ? ACTIVE_CLASS : "border-border"}`}>
          {labels.expenseFree}
        </button>
        <button type="button" onClick={() => setIsFree(false)}
          className={`rounded-lg border px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isFree ? "border-border" : ACTIVE_CLASS}`}>
          {labels.expensePaid}
        </button>
      </div>
      {isFree ? null : <input type="number" value={expense} onChange={(e) => setExpense(e.target.value)} className={INPUT_CLASS} placeholder="50000" />}
    </div>
  );
}

function FormFields({ title, setTitle, parts, setParts, expense, setExpense, isFree, setIsFree,
  condition, setCondition, closedAt, setClosedAt, description, setDescription, labels }: Readonly<{
  title: string; setTitle: (v: string) => void;
  parts: string; setParts: (v: string) => void;
  expense: string; setExpense: (v: string) => void;
  isFree: boolean; setIsFree: (v: boolean) => void;
  condition: string; setCondition: (v: string) => void;
  closedAt: string; setClosedAt: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  labels: Record<string, string>;
}>): React.ReactElement {
  return (
    <>
      <div>
        <label htmlFor="r-title" className="mb-1.5 block text-sm font-medium">{labels.title}</label>
        <input id="r-title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT_CLASS} placeholder={labels.titlePlaceholder} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">{labels.bodyPart}</label>
        <BodyPartChips value={parts} onChange={setParts} labels={labels} />
      </div>
      <ExpenseField isFree={isFree} setIsFree={setIsFree} expense={expense} setExpense={setExpense} labels={labels} />
      <div>
        <label htmlFor="r-condition" className="mb-1.5 block text-sm font-medium">{labels.condition}</label>
        <input id="r-condition" type="text" value={condition} onChange={(e) => setCondition(e.target.value)} className={INPUT_CLASS} placeholder={labels.conditionPlaceholder} />
      </div>
      <div>
        <label htmlFor="r-closed" className="mb-1.5 block text-sm font-medium">{labels.closedAt}</label>
        <input id="r-closed" type="date" required value={closedAt} onChange={(e) => setClosedAt(e.target.value)} className={INPUT_CLASS} />
      </div>
      <div>
        <label htmlFor="r-desc" className="mb-1.5 block text-sm font-medium">{labels.description}</label>
        <textarea id="r-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className={INPUT_CLASS} placeholder={labels.descriptionPlaceholder} />
      </div>
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- hook return type is inferred
function useRecruitmentForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [parts, setParts] = useState("");
  const [expense, setExpense] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [condition, setCondition] = useState("");
  const [closedAt, setClosedAt] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!title.trim() || !closedAt) return;
    startTransition(async () => {
      const result = await createRecruitment({
        title: title.trim(), description: description.trim() || undefined,
        parts: parts || undefined, expense: isFree ? 0 : Number(expense),
        condition: condition.trim() || undefined, closedAt: new Date(closedAt).toISOString(),
      });
      if (result.success) { router.push("/recruitment"); }
      else { setError(result.error ?? "Error"); }
    });
  }

  return { title, setTitle, parts, setParts, expense, setExpense, isFree, setIsFree,
    condition, setCondition, closedAt, setClosedAt, description, setDescription,
    error, isPending, handleSubmit, router };
}

export function RecruitmentCreateClient({ labels}: Readonly<Props>): React.ReactElement {
  const f = useRecruitmentForm();
  return (
    <div>
      <button type="button" onClick={() => f.router.back()}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={labels.goBack ?? "Go back"}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {labels.listTitle}
      </button>
      <h1 className="mb-6 text-xl font-bold">{labels.createNew}</h1>
      <form onSubmit={f.handleSubmit} className="flex flex-col gap-5">
        <FormFields title={f.title} setTitle={f.setTitle} parts={f.parts} setParts={f.setParts}
          expense={f.expense} setExpense={f.setExpense} isFree={f.isFree} setIsFree={f.setIsFree}
          condition={f.condition} setCondition={f.setCondition} closedAt={f.closedAt} setClosedAt={f.setClosedAt}
          description={f.description} setDescription={f.setDescription} labels={labels} />
        {f.error ? <p className="text-sm text-red-500">{f.error}</p> : null}
        <button type="submit" disabled={f.isPending || !f.title.trim() || !f.closedAt}
          className="w-full rounded-lg bg-brand-primary py-3 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
          {f.isPending ? "..." : labels.submit}
        </button>
      </form>
    </div>
  );
}
