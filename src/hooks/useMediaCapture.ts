import { useRef, useCallback } from 'react';
import { float32ToInt16, createPcmBlob } from '../lib/audioUtils';

interface MediaCaptureOptions {
  onAudioChunk: (blob: Blob) => void;
}

export function useMediaCapture({ onAudioChunk }: MediaCaptureOptions) {
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const start = useCallback(async (): Promise<MediaStream> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { width: 640, height: 480, frameRate: 15 },
    });
    streamRef.current = stream;

    const audioCtx = new AudioContext({ sampleRate: 16000 });
    audioCtxRef.current = audioCtx;

    const source = audioCtx.createMediaStreamSource(stream);
    // 4096 buffer size — low enough latency for realtime conversation
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (e) => {
      const float32 = e.inputBuffer.getChannelData(0);
      const int16 = float32ToInt16(float32);
      onAudioChunk(createPcmBlob(int16));
    };
    source.connect(processor);
    processor.connect(audioCtx.destination);
    processorRef.current = processor;

    return stream;
  }, [onAudioChunk]);

  const stop = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const toggleMute = useCallback((muted: boolean) => {
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !muted; });
  }, []);

  return { start, stop, toggleMute, streamRef };
}
