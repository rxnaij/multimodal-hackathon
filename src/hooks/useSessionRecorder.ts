import { useRef, useCallback } from 'react';

export function useSessionRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  const start = useCallback((stream: MediaStream) => {
    chunksRef.current = [];
    startTimeRef.current = Date.now();
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus'
      : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start(1000);
    recorderRef.current = recorder;
  }, []);

  const stop = useCallback((): Promise<{ blob: Blob; durationMs: number }> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      const durationMs = Date.now() - startTimeRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve({ blob: new Blob([], { type: 'video/webm' }), durationMs });
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        resolve({ blob, durationMs });
      };
      recorder.stop();
      recorderRef.current = null;
    });
  }, []);

  return { start, stop };
}
