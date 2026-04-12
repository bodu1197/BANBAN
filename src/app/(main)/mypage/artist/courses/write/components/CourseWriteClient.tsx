// @client-reason: Form state management for course creation
"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FullPageSpinner } from "@/components/ui/full-page-spinner";
import { optimizeImage } from "@/lib/utils/image-optimizer";
import { getStorageUrl } from "@/lib/supabase/storage-utils";

export interface CourseFormData {
  title: string;
  description: string;
  location: string;
  duration: string;
  classType: string;
  category: string;
  price: string;
  originalPrice: string;
  curriculum: string[];
  existingImageUrls: string[];
}

const INITIAL_FORM: CourseFormData = {
  title: "",
  description: "",
  location: "",
  duration: "",
  classType: "OFFLINE",
  category: "COMPREHENSIVE",
  price: "",
  originalPrice: "",
  curriculum: [""],
  existingImageUrls: [],
};

const CATEGORIES = [
  { value: "COMPREHENSIVE", label: "종합" },
  { value: "MACHINE", label: "머신" },
  { value: "DRAWING", label: "드로잉" },
  { value: "OTHER", label: "기타" },
];

const CLASS_TYPES = [
  { value: "OFFLINE", label: "오프라인" },
  { value: "ONLINE", label: "온라인" },
  { value: "HYBRID", label: "온/오프라인" },
];

function FormField({ label, required, children }: Readonly<{
  label: string; required?: boolean; children: React.ReactNode;
}>): React.ReactElement {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium">
        {label}{required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass = "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring";

// --- Array field helpers ---

function updateArrayItem(arr: string[], index: number, value: string): string[] {
  return arr.map((v, i) => (i === index ? value : v));
}

function removeArrayItem(arr: string[], index: number): string[] {
  return arr.filter((_, i) => i !== index);
}

// --- Submit logic (extracted for complexity) ---

function buildCoursePayload(form: CourseFormData, userId: string): Record<string, unknown> {
  const price = Number(form.price);
  const originalPrice = form.originalPrice ? Number(form.originalPrice) : null;
  const hasDiscount = originalPrice !== null && originalPrice > price;
  return {
    artist_id: userId,
    title: form.title.trim(),
    description: form.description.trim() || null,
    location: form.location.trim(),
    duration: form.duration.trim(),
    class_type: form.classType,
    category: form.category,
    price,
    original_price: originalPrice,
    discount_rate: hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0,
    is_active: true,
  };
}

async function uploadCourseImages(supabase: ReturnType<typeof createClient>, files: File[], courseId: string): Promise<string[]> {
  const paths: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const optimized = await optimizeImage(files.at(i) as File, { maxWidth: 1200, maxHeight: 1200, quality: 0.85 });
    const path = `courses/${courseId}/${Date.now()}_${i}.webp`;
    const { error } = await supabase.storage.from("portfolios").upload(path, optimized, { contentType: "image/webp", upsert: true });
    if (error) throw error;
    paths.push(path);
  }
  return paths;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- courses not in generated types
async function saveCourse(db: any, supabase: ReturnType<typeof createClient>, form: CourseFormData, newFiles: File[], userId: string, mode: "create" | "edit", courseId?: string): Promise<void> {
  const payload = buildCoursePayload(form, userId);
  let targetId = courseId;

  if (mode === "edit" && courseId) {
    const { error } = await db.from("courses").update(payload).eq("id", courseId);
    if (error) throw error;
    await db.from("course_curriculum").delete().eq("course_id", courseId);
    await db.from("course_images").delete().eq("course_id", courseId);
  } else {
    const { data, error } = await db.from("courses").insert(payload).select("id").single();
    if (error) throw error;
    targetId = (data as { id: string }).id;
  }

  const uploadedPaths = newFiles.length > 0 ? await uploadCourseImages(supabase, newFiles, targetId as string) : [];
  const allImageUrls = [...form.existingImageUrls, ...uploadedPaths.map((p) => getStorageUrl(p) as string)];

  const curriculumRows = form.curriculum.filter((t) => t.trim()).map((title, i) => ({ course_id: targetId, chapter_number: i + 1, title: title.trim() }));
  const imageRows = allImageUrls.map((url, i) => ({ course_id: targetId, image_url: url, order_index: i }));

  await Promise.all([
    curriculumRows.length > 0 ? db.from("course_curriculum").insert(curriculumRows) : Promise.resolve(),
    imageRows.length > 0 ? db.from("course_images").insert(imageRows) : Promise.resolve(),
  ]);
}

// --- Dynamic list field ---

function DynamicListField({ label, items, placeholder, onUpdate, onRemove, onAdd, addLabel, showIndex }: Readonly<{
  label: string; items: string[]; placeholder: (i: number) => string;
  onUpdate: (i: number, v: string) => void; onRemove: (i: number) => void;
  onAdd: () => void; addLabel: string; showIndex?: boolean;
}>): React.ReactElement {
  return (
    <FormField label={label}>
      <div className="space-y-2">
        {items.map((val, i) => (
          <div key={`${label}-${String(i)}`} className="flex gap-2">
            {showIndex && <span className="flex h-9 w-8 shrink-0 items-center justify-center text-xs text-muted-foreground">{i + 1}.</span>}
            <input type="text" value={val} onChange={(e) => onUpdate(i, e.target.value)} className={`${inputClass} flex-1`} placeholder={placeholder(i)} />
            {items.length > 1 && (
              <button type="button" onClick={() => onRemove(i)} className="shrink-0 rounded-md px-2 text-sm text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="삭제">삭제</button>
            )}
          </div>
        ))}
        <button type="button" onClick={onAdd} className="text-sm text-brand-primary transition-colors hover:text-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{addLabel}</button>
      </div>
    </FormField>
  );
}

// --- Form fields ---

type FormSetter = <K extends keyof CourseFormData>(key: K, value: CourseFormData[K]) => void;

function CourseBasicFields({ form, set }: Readonly<{ form: CourseFormData; set: FormSetter }>): React.ReactElement {
  return (
    <>
      <FormField label="제목" required>
        <input type="text" value={form.title} onChange={(e) => set("title", e.target.value)} className={inputClass} placeholder="수강 제목을 입력하세요" />
      </FormField>
      <FormField label="설명">
        <textarea value={form.description} onChange={(e) => set("description", e.target.value)} className={`${inputClass} min-h-[100px] resize-y`} placeholder="수강 내용을 자세히 설명해주세요" />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="카테고리" required>
          <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputClass}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </FormField>
        <FormField label="수업 형태" required>
          <select value={form.classType} onChange={(e) => set("classType", e.target.value)} className={inputClass}>
            {CLASS_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="위치" required>
          <input type="text" value={form.location} onChange={(e) => set("location", e.target.value)} className={inputClass} placeholder="예: 서울 강남" />
        </FormField>
        <FormField label="기간" required>
          <input type="text" value={form.duration} onChange={(e) => set("duration", e.target.value)} className={inputClass} placeholder="예: 3개월" />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="가격" required>
          <input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} className={inputClass} placeholder="원" min="0" />
        </FormField>
        <FormField label="정가 (할인 전)">
          <input type="number" value={form.originalPrice} onChange={(e) => set("originalPrice", e.target.value)} className={inputClass} placeholder="원 (할인 시 입력)" min="0" />
        </FormField>
      </div>
    </>
  );
}

function ExistingImageGrid({ urls, onRemove }: Readonly<{
  urls: string[]; onRemove: (i: number) => void;
}>): React.ReactElement | null {
  if (urls.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((url, i) => (
        <div key={url} className="group relative">
          <Image src={url} alt="" width={80} height={80} unoptimized className="h-20 w-20 rounded-md border border-border object-cover" />
          <button type="button" onClick={() => onRemove(i)} aria-label="이미지 삭제" className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

function CourseImageUpload({ existingUrls, newFiles, previews, onExistingRemove, onFilesChange }: Readonly<{
  existingUrls: string[]; newFiles: File[]; previews: string[];
  onExistingRemove: (i: number) => void; onFilesChange: (files: File[]) => void;
}>): React.ReactElement {
  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    const added = Array.from(e.target.files ?? []);
    onFilesChange([...newFiles, ...added]);
  }
  return (
    <FormField label="이미지">
      <ExistingImageGrid urls={existingUrls} onRemove={onExistingRemove} />
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((src) => (
            <Image key={src} src={src} alt="preview" width={80} height={80} unoptimized className="h-20 w-20 rounded-md border border-border object-cover" />
          ))}
        </div>
      )}
      <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-border bg-muted transition-colors hover:border-brand-primary focus-visible:border-brand-primary focus-within:border-brand-primary">
        <span className="text-2xl text-muted-foreground">+</span>
        <input type="file" accept="image/*" multiple onChange={handleChange} className="sr-only" />
      </label>
    </FormField>
  );
}

function CourseFormFields({ form, setForm, newFiles, previews, onFilesChange }: Readonly<{
  form: CourseFormData; setForm: React.Dispatch<React.SetStateAction<CourseFormData>>;
  newFiles: File[]; previews: string[]; onFilesChange: (files: File[]) => void;
}>): React.ReactElement {
  const set: FormSetter = (key, value) => { setForm((prev) => ({ ...prev, [key]: value })); };

  return (
    <>
      <CourseBasicFields form={form} set={set} />
      <CourseImageUpload
        existingUrls={form.existingImageUrls} newFiles={newFiles} previews={previews}
        onExistingRemove={(i) => set("existingImageUrls", removeArrayItem(form.existingImageUrls, i))}
        onFilesChange={onFilesChange}
      />
      <DynamicListField
        label="커리큘럼" items={form.curriculum} placeholder={(i) => `${i + 1}장 제목`}
        onUpdate={(i, v) => set("curriculum", updateArrayItem(form.curriculum, i, v))}
        onRemove={(i) => set("curriculum", removeArrayItem(form.curriculum, i))}
        onAdd={() => set("curriculum", [...form.curriculum, ""])} addLabel="+ 커리큘럼 추가" showIndex
      />
    </>
  );
}

// --- Submit handler (extracted for max-lines) ---

async function submitCourse(
  form: CourseFormData, newFiles: File[], userId: string, mode: "create" | "edit", courseId?: string,
): Promise<void> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await saveCourse(supabase as any, supabase, form, newFiles, userId, mode, courseId);
}

// --- Main component ---

interface CourseWriteClientProps {
    mode?: "create" | "edit";
  initialData?: CourseFormData;
  courseId?: string;
}

export default function CourseWriteClient({ mode = "create", initialData, courseId }: Readonly<CourseWriteClientProps>): React.ReactElement {
  const router = useRouter();
  const { user, isArtist, isLoading: authLoading } = useAuth();
  const [form, setForm] = useState<CourseFormData>(initialData ?? INITIAL_FORM);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (authLoading) return <FullPageSpinner />;
  if (!isArtist) { router.push("/login"); return <FullPageSpinner />; }

  const isEdit = mode === "edit";
  const defaultLabel = isEdit ? "수정 완료" : "등록 완료";
  const buttonLabel = submitting ? "처리 중..." : defaultLabel;

  const handleFilesChange = (files: File[]): void => {
    setNewFiles(files);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!user || !form.title.trim() || !form.location.trim() || !form.duration.trim() || !form.price) {
      alert("필수 항목을 모두 입력해주세요."); return;
    }
    setSubmitting(true);
    try {
      await submitCourse(form, newFiles, user.id, mode, courseId);
      alert(isEdit ? "수정되었습니다." : "등록되었습니다.");
      router.push("/mypage/artist/courses");
    } catch { alert(isEdit ? "수정에 실패했습니다." : "등록에 실패했습니다."); }
    finally { setSubmitting(false); }
  };

  return (
    <CourseWriteForm isEdit={isEdit} buttonLabel={buttonLabel} form={form} setForm={setForm}
      newFiles={newFiles} previews={previews} onFilesChange={handleFilesChange} onSubmit={handleSubmit} submitting={submitting} />
  );
}

function CourseWriteForm({ isEdit, buttonLabel, form, setForm, newFiles, previews, onFilesChange, onSubmit, submitting }: Readonly<{
  isEdit: boolean; buttonLabel: string;
  form: CourseFormData; setForm: React.Dispatch<React.SetStateAction<CourseFormData>>;
  newFiles: File[]; previews: string[]; onFilesChange: (files: File[]) => void;
  onSubmit: (e: React.FormEvent) => void; submitting: boolean;
}>): React.ReactElement {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-2">
        <Link href={"/mypage/artist/courses"} className="rounded-lg p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="뒤로 가기">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">{isEdit ? "수강 수정" : "수강 등록"}</h1>
      </div>
      <form onSubmit={onSubmit} className="space-y-5">
        <CourseFormFields form={form} setForm={setForm} newFiles={newFiles} previews={previews} onFilesChange={onFilesChange} />
        <button type="submit" disabled={submitting} className="w-full rounded-md bg-brand-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
          {buttonLabel}
        </button>
      </form>
    </div>
  );
}
