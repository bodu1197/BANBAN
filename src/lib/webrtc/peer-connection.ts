/**
 * WebRTC Peer Connection Manager
 *
 * Wraps RTCPeerConnection with ICE handling, media stream management,
 * and integration with Supabase Realtime signaling.
 */

import type { SignalMessage } from "./signaling";

const ICE_SERVERS: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
];

export interface PeerCallbacks {
    onRemoteStream: (stream: MediaStream) => void;
    onConnectionStateChange: (state: RTCPeerConnectionState) => void;
    onIceCandidate: (candidate: RTCIceCandidateInit) => void;
}

export function createPeerConnection(callbacks: PeerCallbacks): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            callbacks.onIceCandidate(event.candidate.toJSON());
        }
    };

    pc.ontrack = (event) => {
        if (event.streams[0]) {
            callbacks.onRemoteStream(event.streams[0]);
        }
    };

    pc.onconnectionstatechange = () => {
        callbacks.onConnectionStateChange(pc.connectionState);
    };

    return pc;
}

export async function createOffer(pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
}

export async function createAnswer(pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
}

export async function handleSignalMessage(
    pc: RTCPeerConnection,
    message: SignalMessage,
): Promise<RTCSessionDescriptionInit | null> {
    switch (message.type) {
        case "offer": {
            await pc.setRemoteDescription(new RTCSessionDescription(message.payload as RTCSessionDescriptionInit));
            return createAnswer(pc);
        }
        case "answer": {
            await pc.setRemoteDescription(new RTCSessionDescription(message.payload as RTCSessionDescriptionInit));
            return null;
        }
        case "ice-candidate": {
            if (message.payload) {
                await pc.addIceCandidate(new RTCIceCandidate(message.payload as RTCIceCandidateInit));
            }
            return null;
        }
        default:
            return null;
    }
}

export function addLocalStream(pc: RTCPeerConnection, stream: MediaStream): void {
    for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
    }
}

export function closePeerConnection(pc: RTCPeerConnection): void {
    pc.onicecandidate = null;
    pc.ontrack = null;
    pc.onconnectionstatechange = null;
    pc.close();
}
