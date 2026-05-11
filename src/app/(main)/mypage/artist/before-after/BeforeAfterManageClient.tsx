// @client-reason: 파일 미리보기, 수정 상태 관리, 이미지 선택 등 브라우저 인터랙션 필수
"use client";

/* eslint-disable max-lines-per-function */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  Trash2,
  Plus,
  ChevronRight,
  Pencil,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { STRINGS } from "@/lib/strings";
import { useAuth } from "@/hooks/useAuth";
import { FullPageSpinner } from "@/components/ui/full-page-spinner";
import { getStorageUrl } from "@/lib/supabase/storage-utils";
import {
  fetchBeforeAfterPhotos,
  createBeforeAfterPhoto,
  updateBeforeAfterPhoto,
  deleteBeforeAfterPhoto,
} from "./actions";

interface BeforeAfterEntry {
  id: string;
  title: string | null;
  before_image_path: string;
  after_image_path: string;
  order_index: number;
}

async function uploadImage(
  file: File,
  artistId: string,
  prefix: string,
): Promise<string> {
  const form = new globalThis.FormData();
  form.append("file", file);
  const path = `before-after/${artistId}/${prefix}_${Date.now()}.webp`;
  const res = await fetch(
    `/api/upload?bucket=portfolios&path=${encodeURIComponent(path)}`,
    { method: "PUT", body: form },
  );
  const json = (await res.json()) as { success: boolean };
  if (!json.success) {
    throw new Error(
      `${prefix === "before" ? "시술 전" : "시술 후"} 이미지 업로드 실패`,
    );
  }
  return path;
}

function revokePreview(url: string | null): void {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

function EditableImage({
  currentUrl,
  newPreview,
  label,
  onFileSelect,
  onClear,
  isEditing,
}: Readonly<{
  currentUrl: string | null;
  newPreview: string | null;
  label: string;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  isEditing: boolean;
}>): React.ReactElement {
  const displayUrl = newPreview ?? currentUrl;
  const isAfter = label === "시술 후";

  return (
    <div className="relative aspect-square flex-1">
      {displayUrl && (
        <Image
          src={displayUrl}
          alt={label}
          fill
          className="object-cover"
          sizes="(max-width: 767px) 50vw, 384px"
        />
      )}
      <span
        className={`absolute ${isAfter ? "right-2 bottom-2 bg-brand-primary/80" : "bottom-2 left-2 bg-black/60"} rounded-md px-2 py-0.5 text-xs font-medium text-white`}
      >
        {label}
      </span>
      {isEditing && (
        <label className="absolute inset-0 z-10 flex cursor-pointer flex-col items-center justify-center bg-black/40 transition-colors hover:bg-black/50 focus-within:ring-2 focus-within:ring-ring">
          <Plus className="h-6 w-6 text-white" />
          <span className="mt-1 text-xs text-white">변경</span>
          <input
            type="file"
            accept="image/*"
            onChange={onFileSelect}
            className="sr-only"
          />
        </label>
      )}
      {isEditing && newPreview && (
        <button
          type="button"
          onClick={onClear}
          className="absolute top-1 right-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
          aria-label="변경 취소"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function BeforeAfterPreviewCard({
  entry,
  artistId,
  onDelete,
  onUpdate,
  deleting,
}: Readonly<{
  entry: BeforeAfterEntry;
  artistId: string;
  onDelete: (id: string) => void;
  onUpdate: () => void;
  deleting: boolean;
}>): React.ReactElement {
  const beforeUrl = getStorageUrl(entry.before_image_path);
  const afterUrl = getStorageUrl(entry.after_image_path);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(entry.title ?? "");
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const clearPreviews = useCallback(() => {
    revokePreview(beforePreview);
    revokePreview(afterPreview);
    setBeforeFile(null);
    setAfterFile(null);
    setBeforePreview(null);
    setAfterPreview(null);
  }, [beforePreview, afterPreview]);

  const handleStartEdit = (): void => {
    setEditTitle(entry.title ?? "");
    clearPreviews();
    setIsEditing(true);
  };

  const handleCancel = (): void => {
    clearPreviews();
    setIsEditing(false);
  };

  const handleFileSelect = useCallback(
    (type: "before" | "after") =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const preview = URL.createObjectURL(file);
        if (type === "before") {
          revokePreview(beforePreview);
          setBeforeFile(file);
          setBeforePreview(preview);
        } else {
          revokePreview(afterPreview);
          setAfterFile(file);
          setAfterPreview(preview);
        }
        e.target.value = "";
      },
    [beforePreview, afterPreview],
  );

  const handleSave = async (): Promise<void> => {
    if (!editTitle.trim()) {
      globalThis.alert("제목을 입력해주세요.");
      return;
    }

    setIsSaving(true);
    try {
      const [newBeforePath, newAfterPath] = await Promise.all([
        beforeFile
          ? uploadImage(beforeFile, artistId, "before")
          : Promise.resolve(undefined),
        afterFile
          ? uploadImage(afterFile, artistId, "after")
          : Promise.resolve(undefined),
      ]);

      const result = await updateBeforeAfterPhoto({
        artistId,
        photoId: entry.id,
        title: editTitle.trim(),
        ...(newBeforePath ? { beforeImagePath: newBeforePath } : {}),
        ...(newAfterPath ? { afterImagePath: newAfterPath } : {}),
      });

      if (!result.success) throw new Error(result.error);

      clearPreviews();
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error("Edit error:", error); // eslint-disable-line no-console
      globalThis.alert(STRINGS.common.error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {isEditing ? (
        <div className="px-3 pt-2 pb-1">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="제목 입력"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      ) : (
        entry.title && (
          <div className="px-3 pt-2 pb-1">
            <p className="text-sm font-medium">{entry.title}</p>
          </div>
        )
      )}
      <div className="relative flex">
        <EditableImage
          currentUrl={beforeUrl}
          newPreview={beforePreview}
          label="시술 전"
          onFileSelect={handleFileSelect("before")}
          onClear={() => {
            revokePreview(beforePreview);
            setBeforeFile(null);
            setBeforePreview(null);
          }}
          isEditing={isEditing}
        />
        <div className="absolute top-1/2 left-1/2 z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md">
          <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
        </div>
        <EditableImage
          currentUrl={afterUrl}
          newPreview={afterPreview}
          label="시술 후"
          onFileSelect={handleFileSelect("after")}
          onClear={() => {
            revokePreview(afterPreview);
            setAfterFile(null);
            setAfterPreview(null);
          }}
          isEditing={isEditing}
        />
      </div>
      {isEditing ? (
        <div className="flex gap-2 p-2">
          <Button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            variant="outline"
            className="flex-1 text-sm"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            취소
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !editTitle.trim()}
            className="flex-1 bg-brand-primary text-sm text-white hover:bg-brand-primary-hover"
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            {isSaving ? "저장 중..." : "저장"}
          </Button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={handleStartEdit}
            disabled={deleting}
            className="absolute top-2 right-11 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/90 text-white transition-colors hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            aria-label="수정"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(entry.id)}
            disabled={deleting}
            className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-red-500/90 text-white transition-colors hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            aria-label="삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

function UploadForm({
  artistId,
  onSuccess,
}: Readonly<{
  artistId: string;
  onSuccess: () => void;
}>): React.ReactElement {
  const [title, setTitle] = useState("");
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = useCallback(
    (type: "before" | "after") =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const preview = URL.createObjectURL(file);
        if (type === "before") {
          revokePreview(beforePreview);
          setBeforeFile(file);
          setBeforePreview(preview);
        } else {
          revokePreview(afterPreview);
          setAfterFile(file);
          setAfterPreview(preview);
        }
        e.target.value = "";
      },
    [beforePreview, afterPreview],
  );

  const handleSubmit = async (): Promise<void> => {
    if (!title.trim()) {
      globalThis.alert("제목을 입력해주세요.");
      return;
    }
    if (!beforeFile || !afterFile) {
      globalThis.alert("시술 전/후 이미지를 모두 선택해주세요.");
      return;
    }

    setIsUploading(true);
    try {
      const [beforePath, afterPath] = await Promise.all([
        uploadImage(beforeFile, artistId, "before"),
        uploadImage(afterFile, artistId, "after"),
      ]);

      const result = await createBeforeAfterPhoto({
        artistId,
        title: title.trim(),
        beforeImagePath: beforePath,
        afterImagePath: afterPath,
      });

      if (!result.success) throw new Error(result.error);

      revokePreview(beforePreview);
      revokePreview(afterPreview);
      setTitle("");
      setBeforeFile(null);
      setAfterFile(null);
      setBeforePreview(null);
      setAfterPreview(null);
      onSuccess();
    } catch (error) {
      console.error("Upload error:", error); // eslint-disable-line no-console
      globalThis.alert(STRINGS.common.error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold">새 시술 전후 등록</h3>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          제목 <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 눈썹 반영구"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium">
            시술 전 <span className="text-destructive">*</span>
          </label>
          {beforePreview ? (
            <div className="relative aspect-square overflow-hidden rounded-lg border border-border">
              <Image
                src={beforePreview}
                alt="시술 전 미리보기"
                fill
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  revokePreview(beforePreview);
                  setBeforeFile(null);
                  setBeforePreview(null);
                }}
                className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
                aria-label="삭제"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted transition-colors hover:bg-muted/80 focus-within:ring-2 focus-within:ring-ring">
              <Plus className="h-6 w-6 text-muted-foreground" />
              <span className="mt-1 text-xs text-muted-foreground">
                업로드
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect("before")}
                className="sr-only"
              />
            </label>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium">
            시술 후 <span className="text-destructive">*</span>
          </label>
          {afterPreview ? (
            <div className="relative aspect-square overflow-hidden rounded-lg border border-border">
              <Image
                src={afterPreview}
                alt="시술 후 미리보기"
                fill
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  revokePreview(afterPreview);
                  setAfterFile(null);
                  setAfterPreview(null);
                }}
                className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
                aria-label="삭제"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted transition-colors hover:bg-muted/80 focus-within:ring-2 focus-within:ring-ring">
              <Plus className="h-6 w-6 text-muted-foreground" />
              <span className="mt-1 text-xs text-muted-foreground">
                업로드
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect("after")}
                className="sr-only"
              />
            </label>
          )}
        </div>
      </div>

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isUploading || !title.trim() || !beforeFile || !afterFile}
        className="w-full bg-brand-primary py-5 text-sm font-semibold text-white hover:bg-brand-primary-hover"
      >
        {isUploading ? "업로드 중..." : "등록하기"}
      </Button>
    </div>
  );
}

function BeforeAfterManageContent({
  artistId,
}: Readonly<{ artistId: string }>): React.ReactElement {
  const [entries, setEntries] = useState<BeforeAfterEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const loadEntries = useCallback(async () => {
    try {
      const data = await fetchBeforeAfterPhotos(artistId);
      setEntries(data);
    } catch {
      console.error("Failed to load before/after entries"); // eslint-disable-line no-console
    } finally {
      setIsLoading(false);
    }
  }, [artistId]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleDelete = async (photoId: string): Promise<void> => {
    if (!globalThis.confirm("이 시술 전후 사진을 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      const result = await deleteBeforeAfterPhoto(artistId, photoId);
      if (!result.success) throw new Error(result.error);
      setEntries((prev) => prev.filter((e) => e.id !== photoId));
    } catch {
      globalThis.alert(STRINGS.common.error);
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="space-y-4 p-4">
      <UploadForm artistId={artistId} onSuccess={loadEntries} />

      {entries.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            등록된 시술 전후 ({entries.length}개)
          </h3>
          {entries.map((entry) => (
            <BeforeAfterPreviewCard
              key={entry.id}
              entry={entry}
              artistId={artistId}
              onDelete={handleDelete}
              onUpdate={loadEntries}
              deleting={deleting}
            />
          ))}
        </div>
      )}

      {entries.length === 0 && (
        <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">
            등록된 시술 전후 사진이 없습니다
          </p>
        </div>
      )}
    </div>
  );
}

export function BeforeAfterManagePage(): React.ReactElement {
  const { artist, isArtist, isLoading } = useAuth();

  if (isLoading) return <FullPageSpinner />;

  if (!isArtist || !artist?.id) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-[767px] bg-background">
        <div className="flex min-h-[300px] items-center justify-center">
          <p className="text-muted-foreground">
            아티스트 등록 후 이용 가능합니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-[767px] bg-background">
      <header className="sticky top-0 z-50 flex h-14 items-center border-b bg-background px-4">
        <Link
          href="/mypage"
          className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Back"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="ml-2 text-lg font-semibold">
          {STRINGS.mypage.beforeAfterManage}
        </h1>
      </header>

      <BeforeAfterManageContent artistId={artist.id} />
    </div>
  );
}
