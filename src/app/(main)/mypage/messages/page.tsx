// @client-reason: Real-time chat with Supabase Realtime WebSocket
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    Send,
    MessageCircle,
    ArrowLeft,
    Paperclip,
    X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";

// ─── Types ───────────────────────────────────────────────

interface Conversation {
    id: string;
    otherId: string;
    otherName: string;
    otherAvatar: string | null;
    lastMessage: string | null;
    lastMessageAt: string | null;
}

interface Message {
    id: string;
    sender_id: string;
    content: string;
    media_url?: string | null;
    created_at: string;
    read_at: string | null;
}

interface RealtimePayload {
    new: {
        id: string;
        conversation_id: string;
        sender_id: string;
        content: string;
        media_url?: string | null;
        created_at: string;
        read_at: string | null;
    };
}

// ─── Avatar ──────────────────────────────────────────────

function Avatar({ name, size = "md" }: Readonly<{ name: string; size?: "sm" | "md" }>): React.ReactElement {
    const s = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
    const initial = name.charAt(0).toUpperCase();
    const colors = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500", "bg-pink-500", "bg-teal-500"];
    const color = colors[name.charCodeAt(0) % colors.length];
    return (
        <div className={`flex ${s} shrink-0 items-center justify-center rounded-full ${color} font-bold text-white`}>
            {initial}
        </div>
    );
}

// ─── Conversation List ───────────────────────────────────

function ConversationList({ conversations, activeId, onSelect }: Readonly<{
    conversations: Conversation[];
    activeId: string | null;
    onSelect: (conv: Conversation) => void;
}>): React.ReactElement {
    if (conversations.length === 0) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center py-20">
                <MessageCircle className="h-12 w-12 text-muted-foreground/20" />
                <p className="mt-3 text-sm text-muted-foreground">대화가 없습니다.</p>
                <p className="mt-1 text-xs text-muted-foreground">아티스트 프로필에서 메시지를 시작해보세요.</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-border">
            {conversations.map(conv => (
                <button
                    key={conv.id}
                    onClick={() => onSelect(conv)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeId === conv.id ? "bg-muted" : ""
                        }`}
                >
                    <Avatar name={conv.otherName} />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-foreground">{conv.otherName}</p>
                            {conv.lastMessageAt && (
                                <span className="text-[11px] text-muted-foreground">
                                    {formatTimeAgo(conv.lastMessageAt)}
                                </span>
                            )}
                        </div>
                        {conv.lastMessage && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">{conv.lastMessage}</p>
                        )}
                    </div>
                </button>
            ))}
        </div>
    );
}

function mergeRealtimeMsg(prev: Message[], newMsg: Message): Message[] {
    if (prev.some(m => m.id === newMsg.id)) return prev;
    const filtered = prev.filter(m => !(m.id.startsWith("temp-") && m.sender_id === newMsg.sender_id && m.content === newMsg.content));
    return [...filtered, newMsg];
}

// ─── File Upload ─────────────────────────────────────────

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();

async function uploadChatFile(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload?bucket=chat&folder=messages", { method: "POST", body: form });
    if (!res.ok) throw new Error("upload_failed");
    const data = await res.json() as { paths: Record<string, string> };
    const relativePath = data.paths.medium ?? data.paths.large ?? Object.values(data.paths)[0];
    return `${SUPABASE_URL}/storage/v1/object/public/chat/${relativePath}`;
}

// ─── Chat Sub-components ─────────────────────────────────

function ChatHeader({ name, onBack }: Readonly<{
    name: string;
    onBack: () => void;
}>): React.ReactElement {
    return (
        <div className="flex items-center gap-3 border-b border-border bg-background px-4 py-3">
            <button onClick={onBack} className="rounded-lg p-1.5 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="뒤로가기">
                <ArrowLeft className="h-5 w-5" />
            </button>
            <Avatar name={name} size="sm" />
            <div>
                <p className="text-sm font-bold text-foreground">{name}</p>
                <p className="text-[10px] text-emerald-500">실시간 연결됨</p>
            </div>
        </div>
    );
}

function MessageBubble({ msg, isMine }: Readonly<{
    msg: Message;
    isMine: boolean;
}>): React.ReactElement {
    return (
        <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
            <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${isMine
                    ? "rounded-br-md bg-blue-500 text-white"
                    : "rounded-bl-md border border-border bg-muted text-foreground"
                    }`}
            >
                {msg.media_url ? (
                    <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="block">
                        {/* eslint-disable-next-line @next/next/no-img-element -- dynamic chat media URL */}
                        <img src={msg.media_url} alt="첨부 이미지" className="max-h-48 rounded-lg object-contain" loading="lazy" />
                    </a>
                ) : null}
                {msg.content ? <p className="whitespace-pre-wrap break-words">{msg.content}</p> : null}
                <p className={`mt-1 text-right text-[10px] ${isMine ? "text-blue-200" : "text-muted-foreground"}`}>
                    {formatTime(msg.created_at)}
                </p>
            </div>
        </div>
    );
}

function MessageList({ messages, userId, scrollRef }: Readonly<{
    messages: Message[];
    userId: string;
    scrollRef: React.RefObject<HTMLDivElement | null>;
}>): React.ReactElement {
    return (
        <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
            {messages.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                    대화를 시작해보세요.
                </p>
            )}
            {messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} isMine={msg.sender_id === userId} />
            ))}
        </div>
    );
}

function FilePreview({ file, onRemove }: Readonly<{ file: File; onRemove: () => void }>): React.ReactElement {
    const url = useMemo(() => URL.createObjectURL(file), [file]);
    useEffect(() => () => URL.revokeObjectURL(url), [url]);
    return (
        <div className="relative mx-3 mt-2 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob URL preview */}
            <img src={url} alt="미리보기" className="h-20 w-20 rounded-lg border border-border object-cover" />
            <button onClick={onRemove} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white" aria-label="첨부 제거">
                <X className="h-3 w-3" />
            </button>
        </div>
    );
}

function ChatInput({ input, sending, pendingFile, onInputChange, onSend, onKeyDown, onFileSelect, onFileRemove }: Readonly<{
    input: string;
    sending: boolean;
    pendingFile: File | null;
    onInputChange: (value: string) => void;
    onSend: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onFileSelect: (file: File) => void;
    onFileRemove: () => void;
}>): React.ReactElement {
    const fileRef = useRef<HTMLInputElement>(null);
    const canSend = (input.trim() || pendingFile) && !sending;
    return (
        <div className="border-t border-border bg-background">
            {pendingFile ? <FilePreview file={pendingFile} onRemove={onFileRemove} /> : null}
            <div className="flex items-end gap-2 p-3">
                <button
                    onClick={() => fileRef.current?.click()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:outline-none"
                    aria-label="파일 첨부"
                >
                    <Paperclip className="h-5 w-5" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelect(f); e.target.value = ""; }} />
                <textarea
                    value={input}
                    onChange={e => onInputChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="메시지를 입력하세요..."
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none"
                />
                <button
                    onClick={onSend}
                    disabled={!canSend}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white transition-colors hover:bg-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40"
                    aria-label="메시지 보내기"
                >
                    <Send className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

// ─── Chat Hooks ──────────────────────────────────────────

type SetMessages = React.Dispatch<React.SetStateAction<Message[]>>;

function useChatMessages(conversationId: string): { messages: Message[]; setMessages: SetMessages } {
    const [messages, setMessages] = useState<Message[]>([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const res = await fetch(`/api/chat/messages?conversationId=${conversationId}`);
            if (!res.ok || cancelled) return;
            const data = await res.json() as { messages: Message[] };
            if (!cancelled) setMessages(data.messages);
        })();
        return () => { cancelled = true; };
    }, [conversationId]);

    return { messages, setMessages };
}

function useChatRealtime(
    conversationId: string, userId: string,
    setMessages: SetMessages, onNewMessage: () => void,
): void {
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel(`chat:${conversationId}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
                (payload: RealtimePayload) => {
                    const newMsg: Message = {
                        id: payload.new.id, sender_id: payload.new.sender_id,
                        content: payload.new.content, media_url: payload.new.media_url,
                        created_at: payload.new.created_at, read_at: payload.new.read_at,
                    };
                    setMessages(prev => mergeRealtimeMsg(prev, newMsg));
                    if (newMsg.sender_id !== userId) {
                        fetch(`/api/chat/messages?conversationId=${conversationId}`);
                    }
                    onNewMessage();
                },
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [conversationId, userId, setMessages, onNewMessage]);
}

function useChatSend(
    conversationId: string, userId: string,
    input: string, sending: boolean, pendingFile: File | null,
    setInput: (v: string) => void, setSending: (v: boolean) => void,
    setPendingFile: (f: File | null) => void, setMessages: SetMessages,
): { handleSend: () => Promise<void>; handleKeyDown: (e: React.KeyboardEvent) => void } {
    const handleSend = useCallback(async (): Promise<void> => {
        const text = input.trim();
        if ((!text && !pendingFile) || sending) return;
        setSending(true);
        setInput("");
        const fileToSend = pendingFile;
        setPendingFile(null);
        const tempMsg: Message = {
            id: `temp-${Date.now()}`, sender_id: userId,
            content: text || (fileToSend ? "📎 이미지 전송중..." : ""),
            created_at: new Date().toISOString(), read_at: null,
        };
        setMessages(prev => [...prev, tempMsg]);
        try {
            let mediaUrl: string | undefined;
            if (fileToSend) mediaUrl = await uploadChatFile(fileToSend);
            await fetch("/api/chat/messages", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversationId, content: text, mediaUrl }),
            });
        } catch { toast.error("메시지 전송에 실패했습니다."); }
        setSending(false);
    }, [input, sending, pendingFile, userId, conversationId, setInput, setSending, setPendingFile, setMessages]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent): void => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    }, [handleSend]);

    return { handleSend, handleKeyDown };
}

// ─── Chat Thread (with Supabase Realtime) ────────────────

function ChatThread({ conversation, userId, onBack, onNewMessage }: Readonly<{
    conversation: Conversation;
    userId: string;
    onBack: () => void;
    onNewMessage: () => void;
}>): React.ReactElement {
    const { messages, setMessages } = useChatMessages(conversation.id);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useChatRealtime(conversation.id, userId, setMessages, onNewMessage);

    useEffect(() => {
        if (scrollRef.current) { scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }
    }, [messages]);

    const { handleSend, handleKeyDown } = useChatSend(
        conversation.id, userId, input, sending, pendingFile,
        setInput, setSending, setPendingFile, setMessages,
    );

    return (
        <div className="flex h-full flex-col">
            <ChatHeader name={conversation.otherName} onBack={onBack} />
            <MessageList messages={messages} userId={userId} scrollRef={scrollRef} />
            <ChatInput
                input={input} sending={sending} pendingFile={pendingFile}
                onInputChange={setInput} onSend={handleSend} onKeyDown={handleKeyDown}
                onFileSelect={setPendingFile} onFileRemove={() => setPendingFile(null)}
            />
        </div>
    );
}

// ─── Helpers ─────────────────────────────────────────────

function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" });
}

function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "방금";
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}일 전`;
    return new Date(dateStr).toLocaleDateString("ko-KR");
}

// ─── Page Header ─────────────────────────────────────────

function MessagesPageHeader({ count, onBack }: Readonly<{
    count: number;
    onBack: () => void;
}>): React.ReactElement {
    return (
        <header className="flex h-14 shrink-0 items-center border-b border-border bg-background px-4">
            <button onClick={onBack} className="rounded-lg p-2 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="뒤로가기">
                <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="ml-2 text-lg font-bold text-foreground">메시지</h1>
            <span className="ml-auto text-sm text-muted-foreground">{count}개 대화</span>
        </header>
    );
}

// ─── Page Content ────────────────────────────────────────

function MessagesPageContent({ activeConv, conversations, userId, onSelectConv, onBack, onNewMessage }: Readonly<{
    activeConv: Conversation | null;
    conversations: Conversation[];
    userId: string | undefined;
    onSelectConv: (conv: Conversation) => void;
    onBack: () => void;
    onNewMessage: () => void;
}>): React.ReactElement {
    if (activeConv && userId) {
        return (
            <ChatThread
                conversation={activeConv}
                userId={userId}
                onBack={onBack}
                onNewMessage={onNewMessage}
            />
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            <ConversationList
                conversations={conversations}
                activeId={activeConv?.id ?? null}
                onSelect={onSelectConv}
            />
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────

export default function MessagesPage(): React.ReactElement {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConv, setActiveConv] = useState<Conversation | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchConversations = useCallback(async () => {
        const res = await fetch("/api/chat/conversations");
        if (!res.ok) return;
        const data = await res.json() as { conversations: Conversation[] };
        setConversations(data.conversations);
    }, []);


    useEffect(() => {
        if (authLoading) return undefined;
        if (!user) { router.replace("/login"); return undefined; }
        let cancelled = false;
        (async () => {
            await fetchConversations();
            if (!cancelled) setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [authLoading, user, fetchConversations, router]);

    const handleBack = useCallback((): void => {
        setActiveConv(null);
        fetchConversations();
    }, [fetchConversations]);

    if (authLoading || loading) {
        return (
            <div className="flex h-[calc(100dvh-8rem)] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="mx-auto flex h-[calc(100dvh-8rem)] w-full max-w-[767px] flex-col">
            <MessagesPageHeader count={conversations.length} onBack={() => router.back()} />
            <div className="flex-1 overflow-hidden">
                <MessagesPageContent
                    activeConv={activeConv}
                    conversations={conversations}
                    userId={user?.id}
                    onSelectConv={setActiveConv}
                    onBack={handleBack}
                    onNewMessage={fetchConversations}
                />
            </div>
        </div>
    );
}
