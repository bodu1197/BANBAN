// @client-reason: Interactive inline chat modal with Supabase Realtime + WebRTC calls + file attachment
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { X, Send, MessageCircle, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
// TODO: WebRTC 통화 비활성화 — signaling 레이스 컨디션 + TURN 서버 부재 (project_webrtc_issues.md 참조)
// import { CallOverlay, useWebRTCCall } from "@/components/call";
// import type { CallType, CallStatus } from "@/components/call";

interface Message {
    id: string;
    sender_id: string;
    content: string;
    media_url?: string | null;
    created_at: string;
}

interface RealtimePayload {
    new: Message & { conversation_id: string; read_at: string | null };
}

function mergeRealtimeMessage(prev: Message[], newMsg: Message): Message[] {
    if (prev.some(m => m.id === newMsg.id)) return prev;
    const filtered = prev.filter(m => !(m.id.startsWith("temp-") && m.sender_id === newMsg.sender_id && m.content === newMsg.content));
    return [...filtered, newMsg];
}

interface InlineChatProps {
    otherUserId: string;
    otherName: string;
    currentUserId: string;
    isOpen: boolean;
    onClose: () => void;
}

function ChatHeader({ otherName, onClose }: Readonly<{
    otherName: string;
    onClose: () => void;
}>): React.ReactElement {
    return (
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-500" />
                <p className="text-sm font-bold text-foreground">{otherName}</p>
                <span className="text-[10px] text-emerald-500">실시간</span>
            </div>
            <div className="flex items-center gap-1">
                {/* TODO: 음성/영상 통화 버튼 — WebRTC signaling 레이스 컨디션 + TURN 서버 부재로 비활성화 (project_webrtc_issues.md 참조) */}
                <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none" aria-label="닫기">
                    <X className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}

function ImagePreview({ file, onRemove }: Readonly<{
    file: File; onRemove: () => void;
}>): React.ReactElement {
    const url = useMemo(() => URL.createObjectURL(file), [file]);
    useEffect(() => () => URL.revokeObjectURL(url), [url]);
    return (
        <div className="relative mx-3 mt-2 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob URL preview, not optimizable */}
            <img src={url} alt="미리보기" className="h-20 w-20 rounded-lg border border-border object-cover" />
            <button onClick={onRemove} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white" aria-label="첨부 제거">
                <X className="h-3 w-3" />
            </button>
        </div>
    );
}

function ChatInputArea({ input, sending, pendingFile, onInputChange, onSend, onKeyDown, onFileSelect, onFileRemove }: Readonly<{
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
        <div className="border-t border-border">
            {pendingFile ? <ImagePreview file={pendingFile} onRemove={onFileRemove} /> : null}
            <div className="flex items-end gap-2 p-3">
                <button
                    onClick={() => fileRef.current?.click()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:outline-none"
                    aria-label="파일 첨부"
                >
                    <Paperclip className="h-5 w-5" />
                </button>
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelect(f); e.target.value = ""; }}
                />
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
                    aria-label="전송"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white transition-colors hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                >
                    <Send className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

function MessageBubble({ msg, isMine }: Readonly<{
    msg: Message; isMine: boolean;
}>): React.ReactElement {
    const time = new Date(msg.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" });
    return (
        <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${isMine
                ? "rounded-br-md bg-blue-500 text-white"
                : "rounded-bl-md border border-border bg-muted text-foreground"
            }`}>
                {msg.media_url ? (
                    <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="block">
                        {/* eslint-disable-next-line @next/next/no-img-element -- dynamic chat media URL */}
                        <img src={msg.media_url} alt="첨부 이미지" className="max-h-48 rounded-lg object-contain" loading="lazy" />
                    </a>
                ) : null}
                {msg.content ? <p className="whitespace-pre-wrap break-words">{msg.content}</p> : null}
                <p className={`mt-1 text-right text-[10px] ${isMine ? "text-blue-200" : "text-muted-foreground"}`}>{time}</p>
            </div>
        </div>
    );
}

interface UseChatReturn {
    conversationId: string | null;
    messages: Message[];
    loading: boolean;
    input: string;
    sending: boolean;
    pendingFile: File | null;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    setInput: (value: string) => void;
    setPendingFile: (file: File | null) => void;
    handleSend: () => Promise<void>;
    handleKeyDown: (e: React.KeyboardEvent) => void;
}

function useChatConversation(
    isOpen: boolean,
    otherUserId: string,
    setConversationId: (id: string) => void,
    setMessages: (msgs: Message[]) => void,
    setLoading: (v: boolean) => void,
): void {
    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        setLoading(true);
        (async () => {
            try {
                const res = await fetch("/api/chat/conversations", {
                    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ otherUserId }),
                });
                if (!res.ok || cancelled) return;
                const data = await res.json() as { conversationId: string };
                if (cancelled) return;
                setConversationId(data.conversationId);
                const msgRes = await fetch(`/api/chat/messages?conversationId=${data.conversationId}`);
                if (!msgRes.ok || cancelled) return;
                const msgData = await msgRes.json() as { messages: Message[] };
                if (!cancelled) { setMessages(msgData.messages); setLoading(false); }
            } catch { /* silently fail */ }
        })();
        return () => { cancelled = true; };
    }, [isOpen, otherUserId, setConversationId, setMessages, setLoading]);
}

function useChatRealtime(
    conversationId: string | null,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
): void {
    useEffect(() => {
        if (!conversationId) return;
        const supabase = createClient();
        const channel = supabase
            .channel(`inline-chat:${conversationId}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
                (payload: RealtimePayload) => {
                    const n = payload.new;
                    const newMsg: Message = { id: n.id, sender_id: n.sender_id, content: n.content, media_url: n.media_url, created_at: n.created_at };
                    setMessages(prev => mergeRealtimeMessage(prev, newMsg));
                })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [conversationId, setMessages]);
}

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const CHAT_BUCKET = "chat";

async function uploadChatFile(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/upload?bucket=${CHAT_BUCKET}&folder=messages`, { method: "POST", body: form });
    if (!res.ok) throw new Error("upload_failed");
    const data = await res.json() as { paths: Record<string, string> };
    const relativePath = data.paths.medium ?? data.paths.large ?? Object.values(data.paths)[0];
    return `${SUPABASE_URL}/storage/v1/object/public/${CHAT_BUCKET}/${relativePath}`;
}

function useChat(otherUserId: string, currentUserId: string, isOpen: boolean): UseChatReturn {
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useChatConversation(isOpen, otherUserId, setConversationId, setMessages, setLoading);
    useChatRealtime(conversationId, setMessages);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = useCallback(async (): Promise<void> => {
        const text = input.trim();
        if ((!text && !pendingFile) || sending || !conversationId) return;
        setSending(true);
        setInput("");
        const fileToSend = pendingFile;
        setPendingFile(null);

        const tempMsg: Message = { id: `temp-${Date.now()}`, sender_id: currentUserId, content: text || (fileToSend ? "📎 이미지 전송중..." : ""), created_at: new Date().toISOString() };
        setMessages(prev => [...prev, tempMsg]);

        try {
            let mediaUrl: string | undefined;
            if (fileToSend) {
                mediaUrl = await uploadChatFile(fileToSend);
            }
            await fetch("/api/chat/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversationId, content: text, mediaUrl }),
            });
        } catch {
            toast.error("메시지 전송에 실패했습니다.");
        }
        setSending(false);
    }, [input, pendingFile, sending, conversationId, currentUserId]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent): void => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    }, [handleSend]);

    return { conversationId, messages, loading, input, sending, pendingFile, scrollRef, setInput, setPendingFile, handleSend, handleKeyDown };
}

export function InlineChat({ otherUserId, otherName, currentUserId, isOpen, onClose }: Readonly<InlineChatProps>): React.ReactElement | null {
    const {
        messages, loading, input, sending, pendingFile, scrollRef,
        setInput, setPendingFile, handleSend, handleKeyDown,
    } = useChat(otherUserId, currentUserId, isOpen);

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
            <div className="fixed bottom-0 left-1/2 z-[70] flex h-[70dvh] w-full max-w-[767px] -translate-x-1/2 flex-col rounded-t-2xl border border-b-0 border-border bg-background shadow-2xl">
                <ChatHeader otherName={otherName} onClose={onClose} />
                <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
                    <ChatMessageList loading={loading} messages={messages} currentUserId={currentUserId} />
                </div>
                <ChatInputArea
                    input={input} sending={sending} pendingFile={pendingFile}
                    onInputChange={setInput} onSend={handleSend} onKeyDown={handleKeyDown}
                    onFileSelect={setPendingFile} onFileRemove={() => setPendingFile(null)}
                />
            </div>
        </>
    );
}

function ChatMessageList({ loading, messages, currentUserId }: Readonly<{
    loading: boolean;
    messages: Message[];
    currentUserId: string;
}>): React.ReactElement {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
        );
    }
    if (messages.length === 0) {
        return <p className="py-8 text-center text-sm text-muted-foreground">대화를 시작해보세요.</p>;
    }
    return (
        <>
            {messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} isMine={msg.sender_id === currentUserId} />
            ))}
        </>
    );
}
