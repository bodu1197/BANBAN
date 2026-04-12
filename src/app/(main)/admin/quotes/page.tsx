// @client-reason: useState for list, fetch for API, user interaction
"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, EyeOff, Check, MessageCircle, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AdminPageHeader, AdminLoadingSpinner, AdminErrorState, AdminSearchBar, AdminPagination } from "@/components/admin/admin-shared";

const API_URL = "/api/admin/quotes";

interface BidInfo {
  artistName: string;
  price: number;
  description: string | null;
  estimatedDuration: string | null;
  status: string;
  createdAt: string;
}

interface ConvMessage {
  senderName: string;
  content: string;
  createdAt: string;
}

interface QuoteItem {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  body_part: string;
  size: string | null;
  style: string | null;
  budget_min: number | null;
  budget_max: number | null;
  reference_images: string[] | null;
  status: string;
  created_at: string;
  userName: string;
  bidCount: number;
  bids: BidInfo[];
  conversationMessages: ConvMessage[];
}

function getStatusLabel(status: string): string {
  if (status === "OPEN") return "모집중";
  if (status === "COMPLETED") return "선택완료";
  if (status === "CANCELLED") return "취소";
  return status;
}

function getStatusColor(status: string): string {
  if (status === "OPEN") return "bg-blue-500/20 text-blue-300";
  if (status === "COMPLETED") return "bg-emerald-500/20 text-emerald-300";
  if (status === "CANCELLED") return "bg-zinc-500/20 text-zinc-400";
  return "bg-zinc-500/20 text-zinc-400";
}

function getBidStatusLabel(status: string): string {
  if (status === "ACCEPTED") return "선택됨";
  if (status === "REJECTED") return "미선택";
  return "대기중";
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" });
}

function formatBudget(min: number | null, max: number | null): string {
  if (!min && !max) return "미정";
  if (min && max) return `${min.toLocaleString()}~${max.toLocaleString()}원`;
  if (min) return `${min.toLocaleString()}원~`;
  return `~${(max as number).toLocaleString()}원`;
}

function BidCard({ bid, isAccepted }: Readonly<{ bid: BidInfo; isAccepted: boolean }>): React.ReactElement {
  const bg = isAccepted ? "bg-emerald-500/10" : "bg-white/5";
  const nameColor = isAccepted ? "text-emerald-300" : "text-zinc-300";
  const priceColor = isAccepted ? "text-emerald-400" : "text-zinc-500";

  return (
    <div className={`rounded-lg ${bg} px-3 py-2`}>
      <div className="flex items-center gap-2">
        {isAccepted ? <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" /> : null}
        <span className={`text-sm font-medium ${nameColor}`}>{bid.artistName}</span>
        <span className={`text-xs ${priceColor}`}>{bid.price.toLocaleString()}원</span>
        {bid.estimatedDuration ? (
          <span className="flex items-center gap-0.5 text-xs text-zinc-500">
            <Clock className="h-3 w-3" aria-hidden="true" />{bid.estimatedDuration}
          </span>
        ) : null}
        <span className={`ml-auto text-[10px] ${isAccepted ? "text-emerald-500" : "text-zinc-600"}`}>{getBidStatusLabel(bid.status)}</span>
      </div>
      {bid.description ? (
        <p className="mt-1 text-xs text-zinc-400">{bid.description}</p>
      ) : null}
    </div>
  );
}

function BidList({ bids }: Readonly<{ bids: BidInfo[] }>): React.ReactElement {
  if (bids.length === 0) {
    return <p className="py-2 text-xs text-zinc-500">응모한 아티스트가 없습니다</p>;
  }

  const accepted = bids.find((b) => b.status === "ACCEPTED");
  const others = bids.filter((b) => b.status !== "ACCEPTED");

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-xs font-medium text-zinc-300">응모 아티스트 ({bids.length}명)</p>
      {accepted ? <BidCard bid={accepted} isAccepted /> : null}
      <div className="space-y-1">
        {others.map((bid, i) => (
          <BidCard key={`bid-${String(i)}`} bid={bid} isAccepted={false} />
        ))}
      </div>
    </div>
  );
}

function formatDateTime(d: string): string {
  return new Date(d).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" });
}

function ConversationSection({ messages }: Readonly<{ messages: ConvMessage[] }>): React.ReactElement {
  if (messages.length === 0) {
    return (
      <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
        <p className="flex items-center gap-1.5 text-xs text-zinc-500">
          <MessageCircle className="h-3 w-3" aria-hidden="true" />대화 내역 없음
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-1">
      <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />대화 내역 ({messages.length}건)
      </p>
      <div className="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-2">
        {messages.map((msg, i) => (
          <div key={`msg-${String(i)}`} className="flex gap-2 text-xs">
            <span className="shrink-0 font-medium text-zinc-400">{msg.senderName}</span>
            <span className="text-zinc-300">{msg.content}</span>
            <span className="ml-auto shrink-0 text-[10px] text-zinc-600">{formatDateTime(msg.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuoteRow({ item, onHide }: Readonly<{
  item: QuoteItem; onHide: (id: string) => void;
}>): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const hasConversation = item.conversationMessages.length > 0;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      <button type="button" onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-expanded={expanded}>
        <div className="flex flex-1 items-center gap-3 overflow-hidden">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusColor(item.status)}`}>{getStatusLabel(item.status)}</span>
          <span className="truncate text-sm font-medium text-white">{item.title}</span>
          <span className="text-xs text-zinc-500">— {item.userName}</span>
        </div>
        <div className="flex items-center gap-3">
          {hasConversation ? <MessageCircle className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" /> : null}
          <span className="text-xs text-zinc-500">입찰 {item.bidCount}</span>
          <span className="text-xs text-zinc-500">{formatDate(item.created_at)}</span>
          {expanded ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-white/10 px-4 pb-4 pt-3">
          <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400 md:grid-cols-4">
            <div>부위: <span className="text-white">{item.body_part}</span></div>
            <div>크기: <span className="text-white">{item.size ?? "미정"}</span></div>
            <div>스타일: <span className="text-white">{item.style ?? "미정"}</span></div>
            <div>예산: <span className="text-white">{formatBudget(item.budget_min, item.budget_max)}</span></div>
          </div>
          {item.description ? (
            <div className="mt-2 flex items-start gap-1.5">
              <FileText className="mt-0.5 h-3 w-3 shrink-0 text-zinc-500" aria-hidden="true" />
              <p className="text-xs text-zinc-300">{item.description}</p>
            </div>
          ) : null}
          <BidList bids={item.bids} />
          {item.status === "COMPLETED" ? <ConversationSection messages={item.conversationMessages} /> : null}
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
export default function AdminQuotesPage(): React.ReactElement {
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
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
      .then((data: { quotes: QuoteItem[]; total: number }) => {
        if (seq === seqRef.current) {
          setQuotes(data.quotes);
          setTotal(data.total);
          setLoading(false);
        }
      })
      .catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => { fetchData(page, search); }, [page, search]);

  const handleHide = async (id: string): Promise<void> => {
    if (!confirm("이 견적 요청을 관리자 목록에서 숨기시겠습니까?")) return;
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
  if (error) return <AdminErrorState message="견적 요청을 불러오는데 실패했습니다" />;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <AdminPageHeader title="견적 요청 관리" count={total} />
      <AdminSearchBar onSearch={(q) => { setSearch(q); setPage(1); }} placeholder="제목 검색..." />
      {quotes.length === 0 ? (
        <p className="py-12 text-center text-zinc-500">견적 요청이 없습니다</p>
      ) : (
        <div className="space-y-2">
          {quotes.map((item) => (
            <QuoteRow key={item.id} item={item} onHide={handleHide} />
          ))}
        </div>
      )}
      <AdminPagination currentPage={page} total={total} limit={20} onPageChange={setPage} />
    </div>
  );
}
