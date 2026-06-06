import { useRef, useState, useCallback } from 'react';
import type { Session, LiveServerMessage } from '@google/genai';
import { Modality } from '@google/genai';
import { genaiClient } from '../lib/geminiClient';
import { playPcmBase64, resetPlaybackQueue } from '../lib/audioUtils';
import type { InterviewConfig, TranscriptEntry } from '../types';

function buildSystemPrompt(config: InterviewConfig): string {
  const questionsSection = config.practiceQuestions.length > 0
    ? `\n\nThe candidate has requested to practice these specific questions in order:\n${config.practiceQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : '';

  const strategySection = config.strategy
    ? `\n\nThe candidate's interview strategy / focus areas:\n${config.strategy}`
    : '';

  return `You are a senior product design interviewer at a top technology company. Your role is to conduct a realistic, professional mock interview to help product designers prepare for actual interviews.

Your interview style:
- Ask one focused question at a time
- After each answer, probe deeper with exactly one targeted follow-up before moving to the next question
- Evaluate portfolio depth, design process rigor, user research methodology, cross-functional collaboration, and communication clarity
- Cover areas like: portfolio walkthroughs, design decision rationale, user research approach, handling design critique, case studies, and behavioral questions using the STAR method in a design context
- Be encouraging but honest — give realistic interview-level scrutiny
- Speak naturally as you would in a real video call interview${strategySection}${questionsSection}

Begin by introducing yourself briefly and asking the candidate to kick things off with a quick overview of themselves and their design background. Keep your responses concise and conversational — this is a spoken interview.`;
}

export type LiveStatus = 'idle' | 'connecting' | 'live' | 'closed' | 'error';

export interface DebugEvent {
  ts: number;
  label: string;
  detail?: string;
}

export interface LiveDebugStats {
  audioChunksSent: number;
  videoFramesSent: number;
  messagesReceived: number;
  lastEventAt: number | null;
  recentEvents: DebugEvent[];
}

export function useGeminiLive(config: InterviewConfig) {
  const sessionRef = useRef<Session | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [status, setStatus] = useState<LiveStatus>('idle');
  const [debug, setDebug] = useState<LiveDebugStats>({
    audioChunksSent: 0,
    videoFramesSent: 0,
    messagesReceived: 0,
    lastEventAt: null,
    recentEvents: [],
  });

  const pushEvent = useCallback((label: string, detail?: string) => {
    const ev: DebugEvent = { ts: Date.now(), label, detail };
    console.debug(`[GeminiLive] ${label}`, detail ?? '');
    setDebug((prev) => ({
      ...prev,
      lastEventAt: ev.ts,
      messagesReceived: prev.messagesReceived + 1,
      recentEvents: [ev, ...prev.recentEvents].slice(0, 10),
    }));
  }, []);

  const appendTranscript = useCallback((role: 'user' | 'model', text: string) => {
    setTranscript((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role) {
        return [...prev.slice(0, -1), { ...last, text: last.text + text }];
      }
      return [...prev, { role, text, timestamp: Date.now() }];
    });
  }, []);

  const handleMessage = useCallback((msg: LiveServerMessage) => {
    const content = msg.serverContent;
    if (!content) return;

    if (content.interrupted) {
      resetPlaybackQueue();
      pushEvent('interrupted', 'model was cut off');
    }

    if (content.modelTurn?.parts) {
      for (const part of content.modelTurn.parts) {
        if (part.inlineData?.mimeType?.startsWith('audio/') && part.inlineData.data) {
          playPcmBase64(part.inlineData.data);
          pushEvent('audio response', `${Math.round(part.inlineData.data.length * 0.75 / 1024)}KB PCM`);
        }
      }
    }

    if (content.inputTranscription?.text) {
      appendTranscript('user', content.inputTranscription.text);
      pushEvent('your speech', content.inputTranscription.text.slice(0, 60));
    }
    if (content.outputTranscription?.text) {
      appendTranscript('model', content.outputTranscription.text);
      pushEvent('model transcript', content.outputTranscription.text.slice(0, 60));
    }
    if (content.turnComplete) {
      pushEvent('turn complete', 'model finished speaking');
    }
  }, [appendTranscript, pushEvent]);

  const connect = useCallback(async () => {
    setStatus('connecting');
    setTranscript([]);
    setDebug({ audioChunksSent: 0, videoFramesSent: 0, messagesReceived: 0, lastEventAt: null, recentEvents: [] });
    console.log('[GeminiLive] connecting...');
    try {
      const session = await genaiClient.live.connect({
        model: 'gemini-2.0-flash-live-001',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: buildSystemPrompt(config),
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => { console.log('[GeminiLive] connected'); setStatus('live'); },
          onmessage: handleMessage,
          onerror: (e) => { console.error('[GeminiLive] error', e); setStatus('error'); },
          onclose: () => { console.log('[GeminiLive] closed'); setStatus('closed'); },
        },
      });
      sessionRef.current = session;
    } catch (err) {
      console.error('Gemini Live connect error:', err);
      setStatus('error');
    }
  }, [config, handleMessage]);

  const sendAudio = useCallback((blob: Blob) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sessionRef.current?.sendRealtimeInput({ audio: blob as any });
    setDebug((prev) => ({ ...prev, audioChunksSent: prev.audioChunksSent + 1 }));
  }, []);

  const sendVideo = useCallback((blob: Blob) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sessionRef.current?.sendRealtimeInput({ media: blob as any });
    setDebug((prev) => ({ ...prev, videoFramesSent: prev.videoFramesSent + 1 }));
  }, []);

  const disconnect = useCallback(() => {
    sessionRef.current?.close();
    sessionRef.current = null;
    setStatus('closed');
  }, []);

  return { connect, disconnect, sendAudio, sendVideo, transcript, status, debug };
}
