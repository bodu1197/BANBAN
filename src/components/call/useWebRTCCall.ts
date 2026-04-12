// @client-reason: WebRTC peer connection + media stream management
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
    createSignalingChannel,
    createPeerConnection,
    createOffer,
    handleSignalMessage,
    addLocalStream,
    closePeerConnection,
    getMediaStream,
    stopMediaStream,
    toggleAudio as toggleAudioUtil,
    toggleVideo as toggleVideoUtil,
} from "@/lib/webrtc";
import type { SignalMessage } from "@/lib/webrtc";

export type CallStatus = "idle" | "calling" | "incoming" | "connected" | "ended";
export type CallType = "audio" | "video";

const MEDIA_ERROR = "마이크/카메라 접근이 거부되었습니다. 브라우저 설정을 확인해주세요.";
const CALL_TIMEOUT_MS = 30_000;
const SIGNAL_REJECT = "call-reject";

interface UseWebRTCCallProps {
    conversationId: string | null;
    currentUserId: string;
    otherUserId: string;
}

interface UseWebRTCCallReturn {
    callStatus: CallStatus;
    callType: CallType;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    isMuted: boolean;
    isVideoOff: boolean;
    startCall: (type: CallType) => Promise<void>;
    acceptCall: () => Promise<void>;
    rejectCall: () => void;
    endCall: () => void;
    toggleMute: () => void;
    toggleCamera: () => void;
}

function resetToIdle(setCallStatus: (s: CallStatus) => void): void {
    setCallStatus("ended");
    setTimeout(() => setCallStatus("idle"), 1500);
}

// eslint-disable-next-line max-lines-per-function -- WebRTC hook requires co-located refs, state, and effects
export function useWebRTCCall({ conversationId, currentUserId, otherUserId }: UseWebRTCCallProps): UseWebRTCCallReturn {
    const [callStatus, setCallStatus] = useState<CallStatus>("idle");
    const [callType, setCallType] = useState<CallType>("audio");
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const signalingRef = useRef<ReturnType<typeof createSignalingChannel> | null>(null);
    const pendingCallTypeRef = useRef<CallType>("audio");
    const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const cleanup = useCallback(() => {
        if (pcRef.current) { closePeerConnection(pcRef.current); pcRef.current = null; }
        if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
        stopMediaStream(localStream);
        setLocalStream(null);
        setRemoteStream(null);
        setIsMuted(false);
        setIsVideoOff(false);
    }, [localStream]);

    const endCall = useCallback(() => {
        signalingRef.current?.send({ type: "call-end", to: otherUserId, payload: null });
        cleanup();
        resetToIdle(setCallStatus);
    }, [otherUserId, cleanup]);

    const setupPC = useCallback((stream: MediaStream): void => {
        const pc = createPeerConnection({
            onRemoteStream: (remote) => setRemoteStream(remote),
            onConnectionStateChange: (state) => {
                if (state === "connected") setCallStatus("connected");
                if (state === "disconnected" || state === "failed") endCall();
            },
            onIceCandidate: (candidate) => {
                signalingRef.current?.send({ type: "ice-candidate", to: otherUserId, payload: candidate });
            },
        });
        addLocalStream(pc, stream);
        pcRef.current = pc;
    }, [otherUserId, endCall]);

    const handlePeerSignal = useCallback(async (message: SignalMessage) => {
        if (!pcRef.current) return;
        if (message.type === "call-accept") {
            if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
            const offer = await createOffer(pcRef.current);
            signalingRef.current?.send({ type: "offer", to: otherUserId, payload: offer });
            return;
        }
        const response = await handleSignalMessage(pcRef.current, message);
        if (response) {
            signalingRef.current?.send({ type: "answer", to: otherUserId, payload: response });
        }
    }, [otherUserId]);

    const handleSignal = useCallback(async (message: SignalMessage) => {
        if (message.type === "call-request") {
            const payload = message.payload as { callType: CallType } | null;
            pendingCallTypeRef.current = payload?.callType ?? "audio";
            setCallType(pendingCallTypeRef.current);
            setCallStatus("incoming");
            toast.info("통화 요청이 들어왔습니다!");
            return;
        }
        if (message.type === SIGNAL_REJECT || message.type === "call-end") {
            cleanup();
            if (message.type === SIGNAL_REJECT) toast.info("상대방이 통화를 거절했습니다.");
            resetToIdle(setCallStatus);
            return;
        }
        await handlePeerSignal(message);
    }, [cleanup, handlePeerSignal]);

    useEffect(() => {
        if (!conversationId) return;
        const supabase = createClient();
        const signaling = createSignalingChannel(supabase, conversationId, currentUserId, handleSignal);
        signalingRef.current = signaling;
        return () => { signaling.destroy(); signalingRef.current = null; };
    }, [conversationId, currentUserId, handleSignal]);

    const startCall = useCallback(async (type: CallType) => {
        if (!conversationId) return;
        setCallType(type);
        setCallStatus("calling");
        try {
            const stream = await getMediaStream({ audio: true, video: type === "video" });
            setLocalStream(stream);
            setupPC(stream);
            signalingRef.current?.send({ type: "call-request", to: otherUserId, payload: { callType: type } });
            // Also ring the recipient's global listener
            const supabase = createClient();
            const ringChannel = supabase.channel(`call-ring:${otherUserId}`);
            ringChannel.subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    ringChannel.send({
                        type: "broadcast", event: "ring",
                        payload: { conversationId, callerId: currentUserId, callerName: "", callType: type },
                    });
                    setTimeout(() => supabase.removeChannel(ringChannel), 2000);
                }
            });
            callTimeoutRef.current = setTimeout(() => {
                setCallStatus((prev) => {
                    if (prev !== "calling") return prev;
                    toast.error("상대방이 응답하지 않습니다.");
                    stopMediaStream(stream);
                    if (pcRef.current) { closePeerConnection(pcRef.current); pcRef.current = null; }
                    setLocalStream(null);
                    return "idle";
                });
            }, CALL_TIMEOUT_MS);
        } catch {
            toast.error(MEDIA_ERROR);
            setCallStatus("idle");
        }
    }, [conversationId, currentUserId, otherUserId, setupPC]);

    const acceptCall = useCallback(async () => {
        if (!conversationId) return;
        setCallStatus("connected");
        try {
            const stream = await getMediaStream({ audio: true, video: pendingCallTypeRef.current === "video" });
            setLocalStream(stream);
            setupPC(stream);
            signalingRef.current?.send({ type: "call-accept", to: otherUserId, payload: null });
        } catch {
            toast.error(MEDIA_ERROR);
            setCallStatus("idle");
        }
    }, [conversationId, otherUserId, setupPC]);

    const rejectCall = useCallback(() => {
        signalingRef.current?.send({ type: SIGNAL_REJECT, to: otherUserId, payload: null });
        setCallStatus("idle");
    }, [otherUserId]);

    const toggleMute = useCallback(() => setIsMuted(!toggleAudioUtil(localStream)), [localStream]);
    const toggleCamera = useCallback(() => setIsVideoOff(!toggleVideoUtil(localStream)), [localStream]);

    useEffect(() => () => { if (pcRef.current) closePeerConnection(pcRef.current); }, []);

    return {
        callStatus, callType, localStream, remoteStream,
        isMuted, isVideoOff,
        startCall, acceptCall, rejectCall, endCall,
        toggleMute, toggleCamera,
    };
}
