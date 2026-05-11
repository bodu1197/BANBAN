// @client-reason: useState for reply form, fetch for API calls
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircleReply, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AdminPageHeader, AdminLoadingSpinner, AdminErrorState } from "@/components/admin/admin-shared";
import { ImageUploader, ImageList } from "@/components/inquiry/ImageUploader";

interface InquiryWithUser {
  id: string;
  user_id: string;
  title: string;
  body: string;
  status: "OPEN" | "REPLIED" | "CLOSED";
  admin_reply: string | null;
  admin_replied_at: string | null;
  image_urls: string[];
  admin_reply_image_urls: string[];
  created_at: string;
  user?: { username: string; nickname: string | null; email: string | null };
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  OPEN: { label: "대기중", className: "bg-yellow-900/30 text-yellow-300" },
  REPLIED: { label: "답변완료", className: "bg-green-900/30 text-green-300" },
  CLOSED: { label: "종료", className: "bg-zinc-800 text-zinc-400" },
};

const JSON_HEADERS = { "Content-Type": "application/json" } as const;
const ADMIN_INQUIRIES_API = "/api/admin/inquiries";

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
  return new Date(dateStr).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" });
}

function ReplyForm({ inquiryId, userId, currentReply, currentImages, onDone }: Readonly<{
  inquiryId: string; userId: string; currentReply: string | null; currentImages: string[]; onDone: () => void;
}>): React.ReactElement {
  const [reply, setReply] = useState(currentReply ?? "");
  const [images, setImages] = useState<string[]>(currentImages);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSubmitting(true);
    const res = await fetch(ADMIN_INQUIRIES_API, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ id: inquiryId, reply: reply.trim(), userId, imageUrls: images }),
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success("답변이 등록되었습니다");
      onDone();
    } else {
      toast.error("답변 등록에 실패했습니다");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2">
      <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="답변을 입력해주세요" rows={3} required disabled={submitting} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" />
      <ImageUploader images={images} onChange={setImages} disabled={submitting} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={submitting}>{submitting ? "..." : "답변 등록"}</Button>
      </div>
    </form>
  );
}

function InquiryHeader({ inquiry, expanded }: Readonly<{
  inquiry: InquiryWithUser; expanded: boolean;
}>): React.ReactElement {
  const userName = getUserDisplayName(inquiry.user);
  return (
    <>
      <div className="flex flex-1 items-center gap-2 overflow-hidden">
        <StatusBadge status={inquiry.status} />
        <span className="truncate text-sm font-medium">{inquiry.title}</span>
        <span className="text-xs text-zinc-400">— {userName}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-400">{formatDate(inquiry.created_at)}</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>
    </>
  );
}

function InquiryActions({ inquiry, onToggleReply, onStatusChange }: Readonly<{
  inquiry: InquiryWithUser;
  onToggleReply: () => void; onStatusChange: (status: string) => void;
}>): React.ReactElement {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={onToggleReply} aria-label="답변 작성">
        <MessageCircleReply className="mr-1 h-3 w-3" />{inquiry.admin_reply ? "답변 수정" : "답변 작성"}
      </Button>
      {inquiry.status !== "CLOSED" && (
        <Button size="sm" variant="outline" onClick={() => onStatusChange("CLOSED")}>종료 처리</Button>
      )}
      {inquiry.status === "CLOSED" && (
        <Button size="sm" variant="outline" onClick={() => onStatusChange("OPEN")}>다시 열기</Button>
      )}
    </div>
  );
}

function AdminReplyBlock({ reply, repliedAt, images }: Readonly<{
  reply: string; repliedAt: string | null; images: string[];
}>): React.ReactElement {
  return (
    <div className="mt-3 rounded-lg bg-brand-primary/5 p-3">
      <p className="text-xs font-semibold text-brand-primary">관리자 답변</p>
      <p className="mt-1 whitespace-pre-wrap text-sm">{reply}</p>
      <ImageList images={images} />
      {repliedAt ? <p className="mt-1 text-xs text-zinc-400">{formatDate(repliedAt)}</p> : null}
    </div>
  );
}

function getUserDisplayName(user?: { username: string; nickname: string | null }): string {
  return user?.nickname ?? user?.username ?? "알 수 없음";
}

function InquiryContent({ inquiry }: Readonly<{ inquiry: InquiryWithUser }>): React.ReactElement {
  const userName = getUserDisplayName(inquiry.user);
  const userEmail = inquiry.user?.email ?? "";
  return (
    <>
      <div className="mb-2 text-xs text-zinc-400">작성자: {userName} {userEmail ? `(${userEmail})` : ""}</div>
      <p className="whitespace-pre-wrap text-sm">{inquiry.body}</p>
      <ImageList images={inquiry.image_urls ?? []} />
      {inquiry.admin_reply ? <AdminReplyBlock reply={inquiry.admin_reply} repliedAt={inquiry.admin_replied_at} images={inquiry.admin_reply_image_urls ?? []} /> : null}
    </>
  );
}

function InquiryBody({ inquiry, onRefresh }: Readonly<{
  inquiry: InquiryWithUser; onRefresh: () => void;
}>): React.ReactElement {
  const [showReplyForm, setShowReplyForm] = useState(false);

  const handleStatusChange = async (status: string): Promise<void> => {
    const res = await fetch(ADMIN_INQUIRIES_API, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ id: inquiry.id, status }),
    });
    if (res.ok) {
      toast.success("상태가 변경되었습니다");
      onRefresh();
    }
  };

  return (
    <div className="border-t border-white/10 px-4 pb-4 pt-3">
      <InquiryContent inquiry={inquiry} />

      <InquiryActions
        inquiry={inquiry}
        onToggleReply={() => setShowReplyForm(!showReplyForm)}
        onStatusChange={handleStatusChange}
      />

      {showReplyForm && (
        <ReplyForm
          inquiryId={inquiry.id}
          userId={inquiry.user_id}
          currentReply={inquiry.admin_reply}
          currentImages={inquiry.admin_reply_image_urls ?? []}
          onDone={() => { setShowReplyForm(false); onRefresh(); }}
        />
      )}
    </div>
  );
}

function InquiryRow({ inquiry, onRefresh }: Readonly<{
  inquiry: InquiryWithUser; onRefresh: () => void;
}>): React.ReactElement {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      <button type="button" onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-expanded={expanded}>
        <InquiryHeader inquiry={inquiry} expanded={expanded} />
      </button>
      {expanded && <InquiryBody inquiry={inquiry} onRefresh={onRefresh} />}
    </div>
  );
}

async function loadInquiries(): Promise<{ inquiries: InquiryWithUser[]; error: boolean }> {
  try {
    const res = await fetch(ADMIN_INQUIRIES_API);
    if (!res.ok) return { inquiries: [], error: true };
    const data = await res.json();
    return { inquiries: data.inquiries ?? [], error: false };
  } catch {
    return { inquiries: [], error: true };
  }
}

export default function AdminInquiriesPage(): React.ReactElement {
  const [inquiries, setInquiries] = useState<InquiryWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const refreshRef = useRef(0);

  const refresh = (): void => {
    refreshRef.current += 1;
    const seq = refreshRef.current;
    loadInquiries().then((result) => {
      if (seq === refreshRef.current) {
        setInquiries(result.inquiries);
        setError(result.error);
        setLoading(false);
      }
    }).catch(() => { setError(true); setLoading(false); });
  };

  // Initial data load
  useEffect(() => { refresh(); }, []);

  if (loading) return <AdminLoadingSpinner />;
  if (error) return <AdminErrorState message="건의사항을 불러오는데 실패했습니다" />;

  const openCount = inquiries.filter((i) => i.status === "OPEN").length;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <AdminPageHeader title="건의사항 관리" count={openCount} countLabel="대기중" />
      {inquiries.length === 0 ? (
        <p className="py-12 text-center text-zinc-400">등록된 건의사항이 없습니다</p>
      ) : (
        <div className="space-y-2">
          {inquiries.map((item) => (
            <InquiryRow key={item.id} inquiry={item} onRefresh={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}
