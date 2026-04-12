// @client-reason: Global incoming call listener using Supabase Realtime broadcast
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CallOverlay } from "./CallOverlay";
import { useWebRTCCall } from "./useWebRTCCall";
import type { CallType } from "./useWebRTCCall";

interface IncomingCallInfo {
  conversationId: string;
  callerId: string;
  callerName: string;
  callType: CallType;
}

function useCallRingListener(userId: string, onRing: (info: IncomingCallInfo) => void): void {
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`call-ring:${userId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "ring" }, ({ payload }: { payload: IncomingCallInfo }) => {
        onRing({ ...payload, callerName: payload.callerName || "사용자" });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, onRing]);
}

function GlobalCallInner({ userId }: Readonly<{ userId: string }>): React.ReactElement | null {
  const [incoming, setIncoming] = useState<IncomingCallInfo | null>(null);

  const call = useWebRTCCall({
    conversationId: incoming?.conversationId ?? null,
    currentUserId: userId,
    otherUserId: incoming?.callerId ?? "",
  });

  const handleRing = useCallback((info: IncomingCallInfo) => {
    setIncoming(prev => prev ?? info);
  }, []);

  useCallRingListener(userId, handleRing);

  const handleReject = useCallback(() => { call.rejectCall(); setIncoming(null); }, [call]);
  const handleEnd = useCallback(() => { call.endCall(); setIncoming(null); }, [call]);

  // Only show overlay when there's an active call
  if (call.callStatus === "idle") return null;

  return (
    <CallOverlay
      callStatus={call.callStatus}
      callType={incoming?.callType ?? call.callType}
      otherName={incoming?.callerName ?? ""}
      localStream={call.localStream}
      remoteStream={call.remoteStream}
      isMuted={call.isMuted}
      isVideoOff={call.isVideoOff}
      onAccept={call.acceptCall}
      onReject={handleReject}
      onEnd={handleEnd}
      onToggleMute={call.toggleMute}
      onToggleCamera={call.toggleCamera}
    />
  );
}

export function GlobalCallListener(): React.ReactElement | null {
  const { user } = useAuth();
  if (!user) return null;
  return <GlobalCallInner userId={user.id} />;
}
