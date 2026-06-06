import { useEffect, useRef, useState, useCallback } from 'react';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { useMediaCapture } from '../hooks/useMediaCapture';
import { useSessionRecorder } from '../hooks/useSessionRecorder';
import { captureVideoFrame } from '../lib/canvasUtils';
import { TranscriptPanel } from '../components/TranscriptPanel';
import type { InterviewConfig, SessionData } from '../types';

interface Props {
  config: InterviewConfig;
  onEnd: (data: SessionData) => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function InterviewScreen({ config, onEnd }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [muted, setMuted] = useState(false);
  const [ending, setEnding] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);

  const { connect, disconnect, sendAudio, sendVideo, transcript, status, debug } = useGeminiLive(config);
  const recorder = useSessionRecorder();
  const capture = useMediaCapture({
    onAudioChunk: useCallback((blob: Blob) => sendAudio(blob), [sendAudio]),
  });

  // Start elapsed clock once we're live
  useEffect(() => {
    if (status === 'live') {
      setElapsedSeconds(0);
      clockRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    } else {
      if (clockRef.current) clearInterval(clockRef.current);
    }
    return () => { if (clockRef.current) clearInterval(clockRef.current); };
  }, [status]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const stream = await capture.start();
      if (cancelled) return;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
      }

      recorder.start(stream);
      await connect();

      frameTimerRef.current = setInterval(async () => {
        if (!videoRef.current) return;
        const blob = await captureVideoFrame(videoRef.current);
        if (blob) sendVideo(blob);
      }, 2000);
    }

    init();

    return () => {
      cancelled = true;
      if (frameTimerRef.current) clearInterval(frameTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnd = async () => {
    setEnding(true);
    setShowEndConfirm(false);
    if (frameTimerRef.current) clearInterval(frameTimerRef.current);
    if (clockRef.current) clearInterval(clockRef.current);
    disconnect();
    capture.stop();
    const { blob, durationMs } = await recorder.stop();
    onEnd({ config, transcript, recordingBlob: blob, durationMs });
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    capture.toggleMute(next);
  };

  const isLive = status === 'live';

  const aiStatusLabel: Record<typeof status, string> = {
    idle: 'AI Interviewer · Initializing',
    connecting: 'AI Interviewer · Connecting',
    live: 'AI Interviewer · Connected',
    closed: 'AI Interviewer · Disconnected',
    error: 'AI Interviewer · Error',
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Video + controls */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Two-up video panels */}
        <div className="flex-1 flex gap-4 p-4 bg-gray-950 min-h-0">
          {/* Interviewer panel */}
          <div className="flex-1 relative bg-gray-800 rounded-2xl overflow-hidden flex flex-col items-center justify-center">
            <span className="absolute top-3 left-3 text-xs text-gray-300 bg-gray-900/70 backdrop-blur-sm px-2.5 py-1 rounded-full">
              Interviewer
            </span>
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mb-3 shadow-lg">
              <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15 10l4.553-2.277A1 1 0 0121 8.74v6.52a1 1 0 01-1.447.894L15 14v-4zM3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <p className="text-white font-semibold text-sm">Sarah Johnson</p>
            <p className="text-gray-400 text-xs mt-0.5">Senior Recruiter</p>
            <span className="absolute bottom-3 left-3 text-gray-500">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1a4 4 0 014 4v7a4 4 0 01-8 0V5a4 4 0 014-4zm-1 17.93V21H9v2h6v-2h-2v-2.07A8.001 8.001 0 0120 12h-2a6 6 0 01-12 0H4a8.001 8.001 0 007 7.93z" />
              </svg>
            </span>
            {/* Interviewer always shown as online for demo */}
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Online
              </span>
            </div>
          </div>

          {/* You / webcam panel */}
          <div className="flex-1 relative bg-gray-800 rounded-2xl overflow-hidden">
            <span className="absolute top-3 left-3 z-10 text-xs text-gray-300 bg-gray-900/70 backdrop-blur-sm px-2.5 py-1 rounded-full">
              You
            </span>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Overlay when no stream yet */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center mb-3 shadow-lg opacity-0 [video:not([srcObject])~&]:opacity-100">
                <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15 10l4.553-2.277A1 1 0 0121 8.74v6.52a1 1 0 01-1.447.894L15 14v-4zM3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
              </div>
            </div>
            <p className="absolute bottom-8 left-0 right-0 text-center text-white font-semibold text-sm pointer-events-none drop-shadow">You</p>
            <p className="absolute bottom-4 left-0 right-0 text-center text-gray-300 text-xs pointer-events-none drop-shadow">Candidate</p>
            {/* REC + timer */}
            {isLive && (
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 bg-red-600/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  REC
                </span>
                <span className="bg-gray-900/80 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-mono tabular-nums">
                  {formatDuration(elapsedSeconds)}
                </span>
              </div>
            )}
            <span className="absolute bottom-3 left-3 text-gray-500">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1a4 4 0 014 4v7a4 4 0 01-8 0V5a4 4 0 014-4zm-1 17.93V21H9v2h6v-2h-2v-2.07A8.001 8.001 0 0120 12h-2a6 6 0 01-12 0H4a8.001 8.001 0 007 7.93z" />
              </svg>
            </span>
          </div>
        </div>

        {/* Current question bar */}
        {config.practiceQuestions[0] && (
          <div className="mx-4 mb-2 px-5 py-3.5 bg-gray-800/80 border border-gray-700 rounded-xl">
            <p className="text-xs text-gray-500 mb-1 font-medium">Current Question</p>
            <p className="text-sm text-gray-100 leading-snug">{config.practiceQuestions[0]}</p>
          </div>
        )}

        {/* Controls bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-t border-gray-800 shrink-0">
          {/* Left: mic toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleMute}
              className={`w-11 h-11 rounded-full flex items-center justify-center text-lg transition-colors ${
                muted
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title={muted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {muted ? '🔇' : '🎙️'}
            </button>
            <span className="text-xs text-gray-500">{muted ? 'Muted' : 'Mic on'}</span>
          </div>

          {/* Center: duration while live */}
          {isLive && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="font-mono tabular-nums">{formatDuration(elapsedSeconds)}</span>
              <span className="text-gray-600">recording</span>
            </div>
          )}
          {!isLive && <div />}

          {/* Right: end interview */}
          <div className="relative">
            {showEndConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">End interview?</span>
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEnd}
                  disabled={ending}
                  className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-full font-semibold transition-colors"
                >
                  {ending ? 'Ending...' : 'End & view results'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowEndConfirm(true)}
                disabled={ending}
                className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-sm font-semibold transition-colors"
              >
                End Interview
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Transcript + debug sidebar */}
      <div className="w-80 flex flex-col border-l border-gray-800">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-400">Live Transcript</h2>
          {isLive && (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
              Live
            </span>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          <TranscriptPanel entries={transcript} />
        </div>

        {/* Debug panel */}
        <div className="border-t border-gray-800 shrink-0">
          <button
            onClick={() => setDebugOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-500 hover:text-gray-400 hover:bg-gray-900/50 transition-colors"
          >
            <span className="font-mono">Debug</span>
            <span>{debugOpen ? '▲' : '▼'}</span>
          </button>

          {debugOpen && (
            <div className="px-4 pb-4 space-y-3 text-xs font-mono bg-gray-950">
              {/* Counters */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { label: 'Audio sent', value: debug.audioChunksSent },
                  { label: 'Frames sent', value: debug.videoFramesSent },
                  { label: 'Msgs recv', value: debug.messagesReceived },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-900 rounded p-2 text-center">
                    <div className="text-white font-bold text-base tabular-nums">{value}</div>
                    <div className="text-gray-500 mt-0.5 leading-tight">{label}</div>
                  </div>
                ))}
              </div>

              {/* Event log */}
              <div className="space-y-1">
                <div className="text-gray-600 uppercase tracking-wide text-[10px]">Recent events</div>
                {debug.recentEvents.length === 0 && (
                  <div className="text-gray-600 italic">No events yet</div>
                )}
                {debug.recentEvents.map((ev, i) => (
                  <div key={i} className="flex gap-2 text-[10px] leading-snug">
                    <span className="text-gray-600 shrink-0">
                      {new Date(ev.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span>
                      <span className="text-indigo-400">{ev.label}</span>
                      {ev.detail && <span className="text-gray-500"> · {ev.detail}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
