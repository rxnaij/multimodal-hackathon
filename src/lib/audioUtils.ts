export function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = clamped < 0 ? clamped * 32768 : clamped * 32767;
  }
  return int16;
}

export function int16ToFloat32(int16: Int16Array): Float32Array {
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  return float32;
}

export function base64ToInt16Array(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

export function createPcmBlob(int16: Int16Array): Blob {
  return new Blob([int16.buffer as ArrayBuffer], { type: 'audio/l16;rate=16000' });
}

let audioCtx: AudioContext | null = null;
let nextPlayTime = 0;

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext({ sampleRate: 24000 });
    nextPlayTime = audioCtx.currentTime;
  }
  return audioCtx;
}

export function playPcmBase64(base64: string) {
  const ctx = getAudioContext();
  const int16 = base64ToInt16Array(base64);
  const float32 = int16ToFloat32(int16);
  const buffer = ctx.createBuffer(1, float32.length, 24000);
  buffer.copyToChannel(float32 as Float32Array<ArrayBuffer>, 0);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  const startAt = Math.max(ctx.currentTime, nextPlayTime);
  src.start(startAt);
  nextPlayTime = startAt + buffer.duration;
}

export function resetPlaybackQueue() {
  nextPlayTime = 0;
}
