// @client-reason: form with state management for editing quote requests
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Upload, X } from "lucide-react";
import { updateQuoteRequest } from "@/lib/actions/quote-actions";
import type { QuoteRequestDetail } from "@/lib/supabase/quote-queries";

interface Props {
  request: QuoteRequestDetail;
  labels: Record<string, string>;
  }

const BODY_PART_KEYS = [
  "bodyPartArm", "bodyPartLeg", "bodyPartBack", "bodyPartChest", "bodyPartShoulder",
  "bodyPartWrist", "bodyPartAnkle", "bodyPartNeck", "bodyPartRib", "bodyPartThigh", "bodyPartOther",
] as const;

const INPUT_CLASS = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const QUOTE_REQUEST_PATH = "/quote-request";

function SizeSelector({ value, onChange, labels }: Readonly<{
  value: string;
  onChange: (v: string) => void;
  labels: Record<string, string>;
}>): React.ReactElement {
  const sizes = [
    { value: "small", label: labels.sizeSmall },
    { value: "medium", label: labels.sizeMedium },
    { value: "large", label: labels.sizeLarge },
    { value: "xlarge", label: labels.sizeXLarge },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {sizes.map((s) => (
        <button
          key={s.value}
          type="button"
          onClick={() => onChange(s.value)}
          className={`rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            value === s.value
              ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
              : "border-border hover:border-brand-primary focus-visible:border-brand-primary"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function BodyPartSelector({ value, onChange, labels }: Readonly<{
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
          <button
            key={key}
            type="button"
            onClick={() => onChange(label)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              value === label
                ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                : "border-border hover:border-brand-primary focus-visible:border-brand-primary"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ImagePicker({ images, onAdd, onRemove, labels }: Readonly<{
  images: string[];
  onAdd: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (i: number) => void;
  labels: Record<string, string>;
}>): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-2">
      {images.map((img, i) => (
        <div key={`img-${String(i)}`} className="relative h-20 w-20 overflow-hidden rounded-lg border">
          <Image src={img} alt="" fill className="object-cover" unoptimized />
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={labels.removeImage ?? "Remove image"}
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      ))}
      {images.length < 5 ? (
        <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border transition-colors hover:border-brand-primary focus-visible:border-brand-primary focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-ring">
          <Upload className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <input type="file" accept="image/*" multiple onChange={onAdd} className="sr-only" />
        </label>
      ) : null}
    </div>
  );
}

function FormField({ label, htmlFor, children }: Readonly<{
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

interface EditFormState {
  title: string; setTitle: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  bodyPart: string; setBodyPart: (v: string) => void;
  size: string; setSize: (v: string) => void;
  style: string; setStyle: (v: string) => void;
  budgetMin: string; setBudgetMin: (v: string) => void;
  budgetMax: string; setBudgetMax: (v: string) => void;
  images: string[];
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeImage: (i: number) => void;
  error: string;
  isPending: boolean;
  handleSubmit: (e: React.FormEvent) => void;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- hook return type is inferred
function useEditForm(request: QuoteRequestDetail) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(request.title);
  const [description, setDescription] = useState(request.description ?? "");
  const [bodyPart, setBodyPart] = useState(request.bodyPart);
  const [size, setSize] = useState(request.size ?? "");
  const [style, setStyle] = useState(request.style ?? "");
  const [budgetMin, setBudgetMin] = useState(request.budgetMin ? String(request.budgetMin) : "");
  const [budgetMax, setBudgetMax] = useState(request.budgetMax ? String(request.budgetMax) : "");
  const [images, setImages] = useState<string[]>(request.referenceImages ?? []);
  const [error, setError] = useState("");

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>): void {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files).slice(0, 5 - images.length)) {
      const reader = new FileReader();
      reader.onload = () => setImages((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    }
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!title.trim() || !bodyPart) return;
    startTransition(async () => {
      const result = await updateQuoteRequest(request.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        bodyPart,
        size: size || undefined,
        style: style.trim() || undefined,
        budgetMin: budgetMin ? Number(budgetMin) : undefined,
        budgetMax: budgetMax ? Number(budgetMax) : undefined,
        referenceImages: images.length > 0 ? images : undefined,
      });
      if (result.success) {
        router.push(`${QUOTE_REQUEST_PATH}/${request.id}`);
      } else {
        setError(result.error ?? "Error");
      }
    });
  }

  return {
    title, setTitle, description, setDescription, bodyPart, setBodyPart,
    size, setSize, style, setStyle, budgetMin, setBudgetMin, budgetMax, setBudgetMax,
    images, handleImageUpload, removeImage: (i: number) => setImages((prev) => prev.filter((_, idx) => idx !== i)),
    error, isPending, handleSubmit, router,
  };
}

function EditFormFields({ f, labels }: Readonly<{ f: EditFormState; labels: Record<string, string> }>): React.ReactElement {
  return (
    <>
      <FormField label={labels.title} htmlFor="title">
        <input id="title" type="text" required value={f.title} onChange={(e) => f.setTitle(e.target.value)} className={INPUT_CLASS} placeholder={labels.title} />
      </FormField>
      <FormField label={labels.bodyPart}><BodyPartSelector value={f.bodyPart} onChange={f.setBodyPart} labels={labels} /></FormField>
      <FormField label={labels.size}><SizeSelector value={f.size} onChange={f.setSize} labels={labels} /></FormField>
      <FormField label={labels.style} htmlFor="style">
        <input id="style" type="text" value={f.style} onChange={(e) => f.setStyle(e.target.value)} className={INPUT_CLASS} placeholder={labels.stylePlaceholder} />
      </FormField>
      <FormField label={labels.budget}>
        <div className="flex items-center gap-2">
          <input type="number" value={f.budgetMin} onChange={(e) => f.setBudgetMin(e.target.value)} className={INPUT_CLASS} placeholder={labels.budgetMin} />
          <span className="text-muted-foreground">~</span>
          <input type="number" value={f.budgetMax} onChange={(e) => f.setBudgetMax(e.target.value)} className={INPUT_CLASS} placeholder={labels.budgetMax} />
        </div>
      </FormField>
      <FormField label={labels.description} htmlFor="description">
        <textarea id="description" rows={4} value={f.description} onChange={(e) => f.setDescription(e.target.value)} className={INPUT_CLASS} placeholder={labels.descriptionPlaceholder} />
      </FormField>
      <div>
        <p className="mb-1.5 text-sm font-medium">{labels.referenceImages}</p>
        <p className="mb-2 text-xs text-muted-foreground">{labels.referenceImagesDesc}</p>
        <ImagePicker images={f.images} onAdd={f.handleImageUpload} onRemove={f.removeImage} labels={labels} />
      </div>
    </>
  );
}

export function QuoteRequestEditClient({ request, labels}: Readonly<Props>): React.ReactElement {
  const f = useEditForm(request);

  return (
    <div>
      <button
        type="button"
        onClick={() => f.router.back()}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={labels.goBack ?? "Go back"}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {labels.goBack}
      </button>
      <h1 className="mb-6 text-xl font-bold">{labels.editTitle}</h1>
      <form onSubmit={f.handleSubmit} className="flex flex-col gap-5">
        <EditFormFields f={f} labels={labels} />
        {f.error ? <p className="text-sm text-red-500">{f.error}</p> : null}
        <button type="submit" disabled={f.isPending || !f.title.trim() || !f.bodyPart}
          className="w-full rounded-lg bg-brand-primary py-3 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
          {f.isPending ? "..." : labels.update}
        </button>
      </form>
    </div>
  );
}
