/**
 * Media Stream Utilities
 *
 * Manage camera/microphone access with graceful degradation.
 */

export async function getMediaStream(options: { audio: boolean; video: boolean }): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
        audio: options.audio ? { echoCancellation: true, noiseSuppression: true } : false,
        video: options.video ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } : false,
    });
}

export function stopMediaStream(stream: MediaStream | null): void {
    if (!stream) return;
    for (const track of stream.getTracks()) {
        track.stop();
    }
}

export function toggleAudio(stream: MediaStream | null): boolean {
    if (!stream) return false;
    const track = stream.getAudioTracks()[0];
    if (!track) return false;
    track.enabled = !track.enabled;
    return track.enabled;
}

export function toggleVideo(stream: MediaStream | null): boolean {
    if (!stream) return false;
    const track = stream.getVideoTracks()[0];
    if (!track) return false;
    track.enabled = !track.enabled;
    return track.enabled;
}
