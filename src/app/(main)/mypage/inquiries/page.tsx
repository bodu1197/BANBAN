// @client-reason: useState for form, fetch for API calls, user interaction
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquarePlus, Edit2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ImageUploader, ImageList } from "@/components/inquiry/ImageUploader";

interface Inquiry {
  id: string;
  title: string;
  body: string;
  status: "OPEN" | "REPLIED" | "CLOSED";
  admin_reply: string | null;
  admin_replied_at: string | null;
  image_urls: string[];
  admin_reply_image_urls: string[];
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  OPEN: { label: "대기중", className: "bg-yellow-100 text-yellow-800" },
  REPLIED: { label: "답변완료", className: "bg-green-100 text-green-800" },
  CLOSED: { label: "종료", className: "bg-zinc-100 text-zinc-600" },
};

const JSON_HEADERS = { "Content-Type": "application/json" } as const;
const INQUIRIES_API = "/api/inquiries";

function getStatusConfig(status: string): { label: string; className: string } {
  if (status === "OPEN") return STATUS_LABELS.OPEN;
  if (status === "REPLIED") return STATUS_LABELS.REPLIED;
  if (status === "CLOSED") return STATUS_LABELS.CLOSED;
  return STATUS_LABELS.OPEN;
}

function StatusBadge({ status }: Readonly<{ status: string }>): React.ReactElement {
  const config = getStatusConfig(status);
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", config.className)}>{config.label}</span>;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" });
}

function SubmitButtonLabel({ submitting, isEdit }: Readonly<{ submitting: boolean; isEdit: boolean }>): React.ReactElement {
  if (submitting) return <>...</>;
  return isEdit ? <>수정</> : <>등록</>;
}

function InquiryForm({ initial, onSubmit, onCancel }: Readonly<{
  initial?: { title: string; body: string; imageUrls?: string[] };
  onSubmit: (title: string, body: string, imageUrls: string[]) => Promise<void>;
  onCancel?: () => void;
}>): React.ReactElement {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [images, setImages] = useState<string[]>(initial?.imageUrls ?? []);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    await onSubmit(title.trim(), body.trim(), images);
    setSubmitting(false);
    if (!initial) { setTitle(""); setBody(""); setImages([]); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
      <div className="space-y-1">
        <Label htmlFor="inquiry-title">제목</Label>
        <Input id="inquiry-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="건의사항 제목을 입력해주세요" required disabled={submitting} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="inquiry-body">내용</Label>
        <textarea id="inquiry-body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="건의사항 내용을 자세히 작성해주세요" required disabled={submitting} rows={4} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" />
      </div>
      <div className="space-y-1">
        <Label>이미지 첨부</Label>
        <ImageUploader images={images} onChange={setImages} disabled={submitting} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting} className="flex-1"><SubmitButtonLabel submitting={submitting} isEdit={!!initial} /></Button>
        {onCancel ? <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>취소</Button> : null}
      </div>
    </form>
  );
}

function InquiryItem({ inquiry, onEdit, onDelete }: Readonly<{
  inquiry: Inquiry;
  onEdit: (id: string, title: string, body: string) => void;
  onDelete: (id: string) => void;
}>): React.ReactElement {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-background">
      <button type="button" onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-expanded={expanded}>
        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          <StatusBadge status={inquiry.status} />
          <span className="truncate text-sm font-medium">{inquiry.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{formatDate(inquiry.created_at)}</span>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <p className="whitespace-pre-wrap text-sm text-foreground">{inquiry.body}</p>
          <ImageList images={inquiry.image_urls ?? []} />
          {inquiry.admin_reply ? (
            <div className="mt-3 rounded-lg bg-brand-primary/5 p-3">
              <p className="text-xs font-semibold text-brand-primary">관리자 답변</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{inquiry.admin_reply}</p>
              <ImageList images={inquiry.admin_reply_image_urls ?? []} />
              {inquiry.admin_replied_at ? <p className="mt-1 text-xs text-muted-foreground">{formatDate(inquiry.admin_replied_at)}</p> : null}
            </div>
          ) : null}
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onEdit(inquiry.id, inquiry.title, inquiry.body)} aria-label="수정"><Edit2 className="mr-1 h-3 w-3" />수정</Button>
            <Button size="sm" variant="outline" onClick={() => onDelete(inquiry.id)} className="text-destructive hover:text-destructive focus-visible:text-destructive" aria-label="삭제"><Trash2 className="mr-1 h-3 w-3" />삭제</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function InquiryList({ inquiries, onEdit, onDelete }: Readonly<{
  inquiries: Inquiry[];
  onEdit: (id: string, title: string, body: string) => void;
  onDelete: (id: string) => void;
}>): React.ReactElement {
  if (inquiries.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>등록된 건의사항이 없습니다</p>
        <p className="mt-1 text-sm">건의사항이나 요청사항을 자유롭게 작성해주세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {inquiries.map((item) => (
        <InquiryItem key={item.id} inquiry={item} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

async function loadInquiries(): Promise<Inquiry[]> {
  const res = await fetch(INQUIRIES_API);
  const data = await res.json();
  return data.inquiries ?? [];
}

// eslint-disable-next-line max-lines-per-function
export default function InquiriesPage(): React.ReactElement {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ title: string; body: string; imageUrls?: string[] } | null>(null);
  const refreshRef = useRef(0);

  const refresh = (): void => {
    refreshRef.current += 1;
    const seq = refreshRef.current;
    loadInquiries().then((data) => {
      if (seq === refreshRef.current) {
        setInquiries(data);
        setLoading(false);
      }
    }).catch(() => { setLoading(false); });
  };

  // Initial data load
  useEffect(() => { refresh(); }, []);

  const handleCreate = async (title: string, body: string, imageUrls: string[]): Promise<void> => {
    const res = await fetch(INQUIRIES_API, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ title, body, imageUrls }),
    });
    if (res.ok) {
      toast.success("건의사항이 등록되었습니다");
      setShowForm(false);
      refresh();
    } else {
      const data = await res.json();
      toast.error(data.error ?? "등록에 실패했습니다");
    }
  };

  const handleEdit = (id: string, title: string, body: string): void => {
    const inquiry = inquiries.find((i) => i.id === id);
    setEditingId(id);
    setEditData({ title, body, imageUrls: inquiry?.image_urls ?? [] });
  };

  const handleUpdate = async (title: string, body: string, imageUrls: string[]): Promise<void> => {
    if (!editingId) return;
    const res = await fetch(INQUIRIES_API, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ id: editingId, title, body, imageUrls }),
    });
    if (res.ok) {
      toast.success("수정되었습니다");
      setEditingId(null);
      setEditData(null);
      refresh();
    } else {
      toast.error("수정에 실패했습니다");
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm("삭제하시겠습니까?")) return;
    const res = await fetch(INQUIRIES_API, {
      method: "DELETE",
      headers: JSON_HEADERS,
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      toast.success("삭제되었습니다");
      refresh();
    } else {
      toast.error("삭제에 실패했습니다");
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-[767px] bg-background px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">건의사항</h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)} aria-label="건의사항 작성">
          <MessageSquarePlus className="mr-1 h-4 w-4" />작성하기
        </Button>
      </div>

      {showForm && (
        <div className="mb-4">
          <InquiryForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {editingId && editData ? (
        <div className="mb-4">
          <InquiryForm initial={editData} onSubmit={handleUpdate} onCancel={() => { setEditingId(null); setEditData(null); }} />
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" /></div>
      ) : (
        <InquiryList inquiries={inquiries} onEdit={handleEdit} onDelete={handleDelete} />
      )}
    </div>
  );
}
