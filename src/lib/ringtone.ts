/**
 * Browser ringtone using Web Audio API.
 * Plays a repeating two-tone pattern for incoming calls.
 */

let audioCtx: AudioContext | null = null;
let oscillatorNode: OscillatorNode | null = null;
let gainNode: GainNode | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;

function getAudioContext(): AudioContext {
  audioCtx ??= new AudioContext();
  return audioCtx;
}

function playTone(ctx: AudioContext, gain: GainNode, freq: number, duration: number): void {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;
  osc.connect(gain);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function ringOnce(): void {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") ctx.resume();

  gainNode ??= ctx.createGain();
  gainNode.gain.value = 0.3;
  gainNode.connect(ctx.destination);

  playTone(ctx, gainNode, 440, 0.2);
  setTimeout(() => playTone(ctx, gainNode as GainNode, 520, 0.2), 250);
}

/** Start ringing (repeats every 2 seconds) */
export function startRingtone(): void {
  stopRingtone();
  ringOnce();
  intervalId = setInterval(ringOnce, 2000);
}

/** Stop ringing */
export function stopRingtone(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (oscillatorNode) {
    try { oscillatorNode.stop(); } catch { /* already stopped */ }
    oscillatorNode = null;
  }
}
