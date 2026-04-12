// @client-reason: Admin announcement management with create form and list actions
"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2, Eye, EyeOff, Send } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { AdminLoadingSpinner, AdminErrorState, AdminPageHeader } from "@/components/admin/admin-shared";

// ─── Types ──────────────────────────────────────────────

interface Announcement {
  id: string;
  title: string;
  body: string;
  is_active: boolean;
  created_at: string;
}

const JSON_HEADERS = { "Content-Type": "application/json" } as const;
const QUERY_KEY = ["admin", "announcements"] as const;
const API_URL = "/api/admin/announcements";

// ─── Data fetching ──────────────────────────────────────

async function fetchAnnouncements(): Promise<Announcement[]> {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error("fetch failed");
  const data = await res.json();
  return data.announcements ?? [];
}

// ─── Submit hook ────────────────────────────────────────

function useCreateAnnouncement(onSuccess: () => void): {
  title: string;
  body: string;
  setTitle: (v: string) => void;
  setBody: (v: string) => void;
  sending: boolean;
  submit: () => Promise<void>;
} {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const submit = useCallback(async () => {
    if (!title.trim() || !body.trim()) { toast.error("제목과 내용을 입력해주세요"); return; }
    setSending(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST", headers: JSON_HEADERS,
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("공지가 등록되고 전체 알림이 발송되었습니다");
      setTitle("");
      setBody("");
      onSuccess();
    } catch {
      toast.error("공지 등록에 실패했습니다");
    } finally {
      setSending(false);
    }
  }, [title, body, onSuccess]);

  return { title, body, setTitle, setBody, sending, submit };
}

// ─── Create Form ────────────────────────────────────────

const INPUT_CLASS = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary";

function CreateAnnouncementForm({ onCreated }: Readonly<{
  onCreated: () => void;
}>): React.ReactElement {
  const { title, body, setTitle, setBody, sending, submit } = useCreateAnnouncement(onCreated);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <Plus className="h-4 w-4" /> 새 공지 등록
      </h2>
      <input type="text" placeholder="공지 제목" value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT_CLASS} />
      <textarea placeholder="공지 내용을 입력하세요..." value={body} onChange={(e) => setBody(e.target.value)} rows={4} className={`${INPUT_CLASS} mt-2 resize-none`} />
      <button
        type="button" onClick={submit} disabled={sending}
        className="mt-3 flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
        {sending ? "발송 중..." : "공지 등록 + 전체 알림 발송"}
      </button>
    </div>
  );
}

// ─── Announcement Row ───────────────────────────────────

function AnnouncementRow({ item, onToggle, onDelete }: Readonly<{
  item: Announcement;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}>): React.ReactElement {
  const date = new Date(item.created_at).toLocaleDateString("ko-KR");

  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-white">{item.title}</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            item.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-500/20 text-zinc-400"
          }`}>
            {item.is_active ? "활성" : "비활성"}
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{item.body}</p>
        <p className="mt-1 text-[10px] text-zinc-500">{date}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button" onClick={() => onToggle(item.id, !item.is_active)}
          className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={item.is_active ? "비활성화" : "활성화"}
        >
          {item.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <button
          type="button" onClick={() => onDelete(item.id)}
          className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-500/20 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="삭제"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────

export default function AdminAnnouncementsPage(): React.ReactElement {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data: announcements = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchAnnouncements,
    enabled: !authLoading && !!user,
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient]);

  const handleToggle = async (id: string, active: boolean): Promise<void> => {
    const res = await fetch(API_URL, {
      method: "PATCH", headers: JSON_HEADERS,
      body: JSON.stringify({ id, is_active: active }),
    });
    if (res.ok) { toast.success(active ? "활성화되었습니다" : "비활성화되었습니다"); refresh(); }
  };

  const handleDelete = async (id: string): Promise<void> => {
    const res = await fetch(API_URL, {
      method: "DELETE", headers: JSON_HEADERS,
      body: JSON.stringify({ id }),
    });
    if (res.ok) { toast.success("삭제되었습니다"); refresh(); }
  };

  if (authLoading || isLoading) return <AdminLoadingSpinner />;
  if (error) return <AdminErrorState message="데이터를 불러오지 못했습니다" />;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="전체 공지 관리" />
      <CreateAnnouncementForm onCreated={refresh} />
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-300">공지 목록 ({announcements.length})</h2>
        {announcements.length > 0
          ? announcements.map((a) => <AnnouncementRow key={a.id} item={a} onToggle={handleToggle} onDelete={handleDelete} />)
          : <p className="py-8 text-center text-sm text-zinc-500">등록된 공지가 없습니다</p>}
      </div>
    </div>
  );
}
