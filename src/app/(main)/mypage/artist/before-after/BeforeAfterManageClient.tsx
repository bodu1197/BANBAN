// @client-reason: Interactive form with state management, file uploads
"use client";

/* eslint-disable max-lines-per-function */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Trash2, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STRINGS } from "@/lib/strings";
import { useAuth } from "@/hooks/useAuth";
import { FullPageSpinner } from "@/components/ui/full-page-spinner";
import { getStorageUrl } from "@/lib/supabase/storage-utils";

interface BeforeAfterEntry {
  id: string;
  title: string | null;
  before_image_path: string;
  after_image_path: string;
  order_index: number;
}

function BeforeAfterPreviewCard({
  entry,
  onDelete,
  deleting,
}: Readonly<{
  entry: BeforeAfterEntry;
  onDelete: (id: string) => void;
  deleting: boolean;
}>): React.ReactElement {
  const beforeUrl = getStorageUrl(entry.before_image_path);
  const afterUrl = getStorageUrl(entry.after_image_path);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {entry.title && (
        <div className="px-3 pt-2 pb-1">
          <p className="text-sm font-medium">{entry.title}</p>
        </div>
      )}
      <div className="relative flex">
        <div className="relative aspect-square flex-1">
          {beforeUrl && (
            <Image
              src={beforeUrl}
              alt="시술 전"
              fill
              className="object-cover"
              sizes="(max-width: 767px) 50vw, 384px"
            />
          )}
          <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
            시술 전
          </span>
        </div>
        <div className="absolute top-1/2 left-1/2 z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md">
          <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
        </div>
        <div className="relative aspect-square flex-1">
          {afterUrl && (
            <Image
              src={afterUrl}
              alt="시술 후"
              fill
              className="object-cover"
              sizes="(max-width: 767px) 50vw, 384px"
            />
          )}
          <span className="absolute right-2 bottom-2 rounded-md bg-brand-primary/80 px-2 py-0.5 text-xs font-medium text-white">
            시술 후
          </span>
        </div>
      </div>
      {/* Delete button */}
      <button
        type="button"
        onClick={() => onDelete(entry.id)}
        disabled={deleting}
        className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-red-500/90 text-white transition-colors hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        aria-label="삭제"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
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
    (type: "before" | "after") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const preview = ev.target?.result as string;
        if (type === "before") {
          setBeforeFile(file);
          setBeforePreview(preview);
        } else {
          setAfterFile(file);
          setAfterPreview(preview);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [],
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
      // Upload before image
      const beforeForm = new globalThis.FormData();
      beforeForm.append("file", beforeFile);
      const beforePath = `before-after/${artistId}/before_${Date.now()}.webp`;
      const beforeRes = await fetch(
        `/api/upload?bucket=portfolios&path=${encodeURIComponent(beforePath)}`,
        { method: "PUT", body: beforeForm },
      );
      const beforeJson = (await beforeRes.json()) as { success: boolean };
      if (!beforeJson.success) throw new Error("시술 전 이미지 업로드 실패");

      // Upload after image
      const afterForm = new globalThis.FormData();
      afterForm.append("file", afterFile);
      const afterPath = `before-after/${artistId}/after_${Date.now()}.webp`;
      const afterRes = await fetch(
        `/api/upload?bucket=portfolios&path=${encodeURIComponent(afterPath)}`,
        { method: "PUT", body: afterForm },
      );
      const afterJson = (await afterRes.json()) as { success: boolean };
      if (!afterJson.success) throw new Error("시술 후 이미지 업로드 실패");

      // Create DB entry
      const createRes = await fetch("/api/before-after", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId,
          title: title.trim() || null,
          beforeImagePath: beforePath,
          afterImagePath: afterPath,
        }),
      });
      const createJson = (await createRes.json()) as { success: boolean };
      if (!createJson.success) throw new Error("데이터 저장 실패");

      // Reset form
      setTitle("");
      setBeforeFile(null);
      setAfterFile(null);
      setBeforePreview(null);
      setAfterPreview(null);
      onSuccess();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Upload error:", error);
      globalThis.alert(STRINGS.common.error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold">새 시술 전후 등록</h3>

      {/* Title input */}
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

      {/* Two upload areas side by side */}
      <div className="grid grid-cols-2 gap-3">
        {/* Before image */}
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
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted transition-colors hover:bg-muted/80">
              <Plus className="h-6 w-6 text-muted-foreground" />
              <span className="mt-1 text-xs text-muted-foreground">업로드</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect("before")}
                className="sr-only"
              />
            </label>
          )}
        </div>

        {/* After image */}
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
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted transition-colors hover:bg-muted/80">
              <Plus className="h-6 w-6 text-muted-foreground" />
              <span className="mt-1 text-xs text-muted-foreground">업로드</span>
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
      const res = await fetch(`/api/before-after?artistId=${artistId}`);
      const json = (await res.json()) as { data: BeforeAfterEntry[] };
      setEntries(json.data ?? []);
    } catch {
      // eslint-disable-next-line no-console
      console.error("Failed to load before/after entries");
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
      await fetch("/api/before-after", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId, photoId }),
      });
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
      {/* Upload form */}
      <UploadForm artistId={artistId} onSuccess={loadEntries} />

      {/* Existing entries */}
      {entries.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            등록된 시술 전후 ({entries.length}개)
          </h3>
          {entries.map((entry) => (
            <BeforeAfterPreviewCard
              key={entry.id}
              entry={entry}
              onDelete={handleDelete}
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
          <p className="text-muted-foreground">아티스트 등록 후 이용 가능합니다.</p>
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
