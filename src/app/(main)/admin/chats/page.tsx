// @client-reason: useState for list/messages, fetch for API, user interaction
"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AdminPageHeader, AdminLoadingSpinner, AdminErrorState, AdminSearchBar, AdminPagination } from "@/components/admin/admin-shared";

const API_URL = "/api/admin/chats";

interface ChatRoomItem {
  id: string;
  userName: string;
  artistName: string;
  status: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  createdAt: string;
}

interface MessageItem {
  id: string;
  sender_id: string;
  senderName: string;
  content: string;
  media_url: string | null;
  created_at: string;
}

function formatShortDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" });
}

function MessageList({ roomId }: Readonly<{ roomId: string }>): React.ReactElement {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}?conversationId=${roomId}`)
      .then((res) => res.json())
      .then((data: { messages: MessageItem[] }) => { setMessages(data.messages ?? []); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [roomId]);

  if (loading) return <div className="py-4 text-center text-xs text-zinc-500">로딩중...</div>;
  if (messages.length === 0) return <div className="py-4 text-center text-xs text-zinc-500">메시지가 없습니다</div>;

  return (
    <div className="max-h-80 space-y-2 overflow-y-auto">
      {messages.map((msg) => (
        <div key={msg.id} className="rounded-lg bg-white/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-blue-300">{msg.senderName}</span>
            <span className="text-[10px] text-zinc-600">{formatShortDate(msg.created_at)}</span>
          </div>
          <p className="mt-0.5 text-sm text-zinc-300">{msg.content}</p>
          {msg.media_url ? <p className="mt-0.5 text-[10px] text-zinc-500">[첨부파일]</p> : null}
        </div>
      ))}
    </div>
  );
}

function ChatRow({ item, onHide }: Readonly<{
  item: ChatRoomItem; onHide: (id: string) => void;
}>): React.ReactElement {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      <button type="button" onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-expanded={expanded}>
        <div className="flex flex-1 items-center gap-3 overflow-hidden">
          <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-300">고객</span>
          <span className="text-sm font-medium text-white">{item.userName}</span>
          <span className="text-xs text-zinc-500">↔</span>
          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-300">아티스트</span>
          <span className="text-sm font-medium text-white">{item.artistName}</span>
          {item.lastMessage ? <span className="hidden truncate text-xs text-zinc-500 md:inline">— {item.lastMessage}</span> : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">{formatShortDate(item.lastMessageAt)}</span>
          {expanded ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-white/10 px-4 pb-4 pt-3">
          <MessageList roomId={item.id} />
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onHide(item.id)} className="text-red-400 hover:text-red-300 focus-visible:text-red-300" aria-label="숨기기">
              <EyeOff className="mr-1 h-3 w-3" />숨기기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line max-lines-per-function
export default function AdminChatsPage(): React.ReactElement {
  const [conversations, setConversations] = useState<ChatRoomItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const seqRef = useRef(0);

  const fetchData = (p: number, q: string): void => {
    seqRef.current += 1;
    const seq = seqRef.current;
    const params = new URLSearchParams({ page: String(p), search: q });
    fetch(`${API_URL}?${params}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("fail"))))
      .then((data: { conversations: ChatRoomItem[]; total: number }) => {
        if (seq === seqRef.current) {
          setConversations(data.conversations);
          setTotal(data.total);
          setLoading(false);
        }
      })
      .catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => { fetchData(page, search); }, [page, search]);

  const handleHide = async (id: string): Promise<void> => {
    if (!confirm("이 대화를 관리자 목록에서 숨기시겠습니까?")) return;
    const res = await fetch(API_URL, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      toast.success("숨김 처리되었습니다");
      fetchData(page, search);
    }
  };

  if (loading) return <AdminLoadingSpinner />;
  if (error) return <AdminErrorState message="대화 목록을 불러오는데 실패했습니다" />;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <AdminPageHeader title="채팅 모니터링" count={total} />
      <AdminSearchBar onSearch={(q) => { setSearch(q); setPage(1); }} placeholder="참여자 이름 검색..." />
      {conversations.length === 0 ? (
        <p className="py-12 text-center text-zinc-500">대화가 없습니다</p>
      ) : (
        <div className="space-y-2">
          {conversations.map((item) => (
            <ChatRow key={item.id} item={item} onHide={handleHide} />
          ))}
        </div>
      )}
      <AdminPagination currentPage={page} total={total} limit={20} onPageChange={setPage} />
    </div>
  );
}
