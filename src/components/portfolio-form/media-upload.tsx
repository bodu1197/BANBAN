// @client-reason: File upload inputs and image previews with browser File API
"use client";

import type { ChangeEvent } from "react";
import Image from "next/image";
import { Trash2, Youtube } from "lucide-react";
import { getStorageUrl } from "@/lib/supabase/storage-utils";
import type { MediaItem } from "./types";

// --- Existing media grid (edit mode) ---

export function ExistingMediaGrid({ media, deletedIds, onDelete }: Readonly<{
    media: MediaItem[];
    deletedIds: Set<string>;
    onDelete: (id: string) => void;
}>): React.ReactElement | null {
    const active = media.filter((m) => !deletedIds.has(m.id));
    if (active.length === 0) return null;
    return (
        <div className="flex gap-2 flex-wrap">
            {active.map((m) => (
                <div key={m.id} className="relative group">
                    <Image
                        src={getStorageUrl(m.storage_path) ?? ""}
                        alt=""
                        width={80}
                        height={80}
                        unoptimized
                        className="w-20 h-20 object-cover rounded-md border border-border"
                    />
                    <button
                        type="button"
                        aria-label="이미지 삭제"
                        onClick={(): void => onDelete(m.id)}
                        className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-opacity"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                </div>
            ))}
        </div>
    );
}

// --- Image upload section with individual delete ---

export function ImageUploadSection({ files, previews, onFilesChange, label }: Readonly<{
    files: File[];
    previews: string[];
    onFilesChange: (files: File[]) => void;
    label?: string;
}>): React.ReactElement {
    function handleAdd(e: ChangeEvent<HTMLInputElement>): void {
        const added = Array.from(e.target.files ?? []);
        if (added.length === 0) return;
        onFilesChange([...files, ...added]);
        e.target.value = "";
    }

    function handleRemove(index: number): void {
        onFilesChange(files.filter((_, i) => i !== index));
    }

    return (
        <div>
            <label className="block text-sm font-medium mb-1.5">{label ?? "작품 사진 업로드"} <span className="text-destructive">*</span></label>
            <div className="flex gap-2 flex-wrap">
                {previews.map((src, idx) => (
                    <div key={src} className="relative group">
                        <Image src={src} alt="preview" width={80} height={80} unoptimized className="w-20 h-20 object-cover rounded-md border border-border" />
                        <button
                            type="button"
                            aria-label="이미지 삭제"
                            onClick={(): void => handleRemove(idx)}
                            className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-opacity"
                        >
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </div>
                ))}
                <label className="flex items-center justify-center w-20 h-20 border-2 border-dashed border-border rounded-md cursor-pointer hover:border-brand-primary focus-visible:border-brand-primary focus-within:border-brand-primary transition-colors bg-muted">
                    <span className="text-2xl text-muted-foreground">+</span>
                    <input type="file" accept="image/*" multiple onChange={handleAdd} className="sr-only" />
                </label>
            </div>
        </div>
    );
}

// --- YouTube URL input ---

export function YouTubeUrlInput({ value, onChange }: Readonly<{
    value: string;
    onChange: (url: string) => void;
}>): React.ReactElement {
    return (
        <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                <Youtube className="h-4 w-4 text-red-500" /> YouTube 영상 링크
            </label>
            <input
                type="url"
                value={value}
                onChange={(e): void => onChange(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... 또는 https://youtu.be/..."
                className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {value && <YouTubePreview url={value} />}
        </div>
    );
}

// --- YouTube preview ---

function extractYouTubeId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

export { extractYouTubeId };

function YouTubePreview({ url }: Readonly<{ url: string }>): React.ReactElement | null {
    const videoId = extractYouTubeId(url);
    if (!videoId) {
        return <p className="mt-1.5 text-xs text-destructive">올바른 YouTube URL을 입력해주세요</p>;
    }
    return (
        <div className="mt-3 aspect-video w-full max-w-md overflow-hidden rounded-lg border border-border">
            <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title="YouTube 미리보기"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
            />
        </div>
    );
}
