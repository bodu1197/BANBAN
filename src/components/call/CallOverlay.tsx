// @client-reason: WebRTC call UI — audio/video overlay with media streams
"use client";

import { useRef, useEffect, useState } from "react";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { startRingtone, stopRingtone } from "@/lib/ringtone";
import type { CallStatus, CallType } from "./useWebRTCCall";

// ─── Video Element ──────────────────────────────────────

function VideoStream({ stream, muted, className }: Readonly<{
    stream: MediaStream | null;
    muted: boolean;
    className: string;
}>): React.ReactElement | null {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (ref.current && stream) ref.current.srcObject = stream;
    }, [stream]);

    if (!stream) return null;
    return <video ref={ref} autoPlay playsInline muted={muted} className={className} />;
}

// ─── Call Timer ──────────────────────────────────────────

function useCallTimer(isConnected: boolean): string {
    const [elapsed, setElapsed] = useState("00:00");

    useEffect(() => {
        if (!isConnected) return;
        const start = Date.now();
        const id = setInterval(() => {
            const sec = Math.floor((Date.now() - start) / 1000);
            const m = String(Math.floor(sec / 60)).padStart(2, "0");
            const s = String(sec % 60).padStart(2, "0");
            setElapsed(`${m}:${s}`);
        }, 1000);
        return () => clearInterval(id);
    }, [isConnected]);

    return elapsed;
}

// ─── Incoming Call ──────────────────────────────────────

function IncomingCallView({ otherName, callType, onAccept, onReject }: Readonly<{
    otherName: string;
    callType: CallType;
    onAccept: () => void;
    onReject: () => void;
}>): React.ReactElement {
    useEffect(() => {
        startRingtone();
        return () => stopRingtone();
    }, []);

    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <div className="h-20 w-20 animate-pulse rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
            <div className="text-center">
                <p className="text-xl font-bold text-white">{otherName}</p>
                <p className="mt-1 text-sm text-white/70">
                    {callType === "video" ? "영상 통화 수신중..." : "음성 통화 수신중..."}
                </p>
            </div>
            <div className="flex gap-8">
                <button
                    onClick={onReject}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    aria-label="거절"
                >
                    <PhoneOff className="h-7 w-7" />
                </button>
                <button
                    onClick={onAccept}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    aria-label="수락"
                >
                    <Phone className="h-7 w-7" />
                </button>
            </div>
        </div>
    );
}

// ─── Calling View ───────────────────────────────────────

function CallingView({ otherName, callType, onCancel }: Readonly<{
    otherName: string;
    callType: CallType;
    onCancel: () => void;
}>): React.ReactElement {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <div className="h-20 w-20 animate-bounce rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
            <div className="text-center">
                <p className="text-xl font-bold text-white">{otherName}</p>
                <p className="mt-1 text-sm text-white/70">
                    {callType === "video" ? "영상 통화 연결중..." : "음성 통화 연결중..."}
                </p>
            </div>
            <button
                onClick={onCancel}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="취소"
            >
                <PhoneOff className="h-7 w-7" />
            </button>
        </div>
    );
}

// ─── Connected View ─────────────────────────────────────

function CallControls({ callType, isMuted, isVideoOff, onToggleMute, onToggleCamera, onEnd }: Readonly<{
    callType: CallType;
    isMuted: boolean;
    isVideoOff: boolean;
    onToggleMute: () => void;
    onToggleCamera: () => void;
    onEnd: () => void;
}>): React.ReactElement {
    return (
        <div className="flex items-center justify-center gap-5 pb-8 pt-4">
            <button
                onClick={onToggleMute}
                className={`flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${isMuted ? "bg-red-500/80 text-white" : "bg-white/20 text-white"}`}
                aria-label={isMuted ? "음소거 해제" : "음소거"}
                aria-pressed={isMuted}
            >
                {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>
            {callType === "video" ? (
                <button
                    onClick={onToggleCamera}
                    className={`flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${isVideoOff ? "bg-red-500/80 text-white" : "bg-white/20 text-white"}`}
                    aria-label={isVideoOff ? "카메라 켜기" : "카메라 끄기"}
                    aria-pressed={isVideoOff}
                >
                    {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                </button>
            ) : null}
            <button
                onClick={onEnd}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="통화 종료"
            >
                <PhoneOff className="h-6 w-6" />
            </button>
        </div>
    );
}

function ConnectedView({ otherName, callType, localStream, remoteStream, isMuted, isVideoOff, onToggleMute, onToggleCamera, onEnd }: Readonly<{
    otherName: string;
    callType: CallType;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    isMuted: boolean;
    isVideoOff: boolean;
    onToggleMute: () => void;
    onToggleCamera: () => void;
    onEnd: () => void;
}>): React.ReactElement {
    const timer = useCallTimer(true);

    return (
        <>
            {callType === "video" ? (
                <div className="relative flex-1">
                    <VideoStream stream={remoteStream} muted={false} className="h-full w-full object-cover" />
                    <VideoStream stream={localStream} muted={true} className="absolute bottom-4 right-4 h-32 w-24 rounded-xl border-2 border-white/30 object-cover shadow-lg" />
                </div>
            ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-4">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600">
                        <Phone className="h-10 w-10 text-white" />
                    </div>
                    <p className="text-xl font-bold text-white">{otherName}</p>
                    <p className="font-mono text-sm text-white/70">{timer}</p>
                </div>
            )}
            <CallControls callType={callType} isMuted={isMuted} isVideoOff={isVideoOff} onToggleMute={onToggleMute} onToggleCamera={onToggleCamera} onEnd={onEnd} />
        </>
    );
}

// ─── Ended View ─────────────────────────────────────────

function EndedView(): React.ReactElement {
    return (
        <div className="flex flex-1 items-center justify-center">
            <p className="text-lg font-medium text-white/70">통화가 종료되었습니다</p>
        </div>
    );
}

// ─── Main Overlay ───────────────────────────────────────

interface CallOverlayProps {
    callStatus: CallStatus;
    callType: CallType;
    otherName: string;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    isMuted: boolean;
    isVideoOff: boolean;
    onAccept: () => void;
    onReject: () => void;
    onEnd: () => void;
    onToggleMute: () => void;
    onToggleCamera: () => void;
}

export function CallOverlay({
    callStatus, callType, otherName, localStream, remoteStream,
    isMuted, isVideoOff, onAccept, onReject, onEnd, onToggleMute, onToggleCamera,
}: Readonly<CallOverlayProps>): React.ReactElement | null {
    if (callStatus === "idle") return null;

    return (
        <div className="fixed inset-0 z-[80] flex flex-col bg-zinc-900/95 backdrop-blur-sm">
            {callStatus === "incoming" && (
                <IncomingCallView otherName={otherName} callType={callType} onAccept={onAccept} onReject={onReject} />
            )}
            {callStatus === "calling" && (
                <CallingView otherName={otherName} callType={callType} onCancel={onEnd} />
            )}
            {callStatus === "connected" && (
                <ConnectedView
                    otherName={otherName} callType={callType}
                    localStream={localStream} remoteStream={remoteStream}
                    isMuted={isMuted} isVideoOff={isVideoOff}
                    onToggleMute={onToggleMute} onToggleCamera={onToggleCamera} onEnd={onEnd}
                />
            )}
            {callStatus === "ended" && <EndedView />}
        </div>
    );
}
