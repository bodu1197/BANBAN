/**
 * WebRTC Signaling via Supabase Realtime Broadcast
 *
 * Uses Supabase Realtime Broadcast channels for SDP offer/answer
 * and ICE candidate exchange. No additional server required.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type SignalType = "offer" | "answer" | "ice-candidate" | "call-request" | "call-accept" | "call-reject" | "call-end";

export interface SignalMessage {
    type: SignalType;
    from: string;
    to: string;
    payload: RTCSessionDescriptionInit | RTCIceCandidateInit | { callType: "audio" | "video" } | null;
}

export type SignalHandler = (message: SignalMessage) => void;

export function createSignalingChannel(
    supabase: SupabaseClient,
    conversationId: string,
    userId: string,
    onSignal: SignalHandler,
): { send: (message: Omit<SignalMessage, "from">) => void; destroy: () => void } {
    const channelName = `webrtc:${conversationId}`;

    const channel = supabase.channel(channelName, { config: { broadcast: { self: false } } })
        .on("broadcast", { event: "signal" }, ({ payload }: { payload: SignalMessage }) => {
            if (payload.to === userId) onSignal(payload);
        })
        .subscribe();

    function send(message: Omit<SignalMessage, "from">): void {
        channel.send({ type: "broadcast", event: "signal", payload: { ...message, from: userId } });
    }

    function destroy(): void {
        supabase.removeChannel(channel);
    }

    return { send, destroy };
}
