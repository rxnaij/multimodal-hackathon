import { useEffect, useRef, useState } from 'react';
import { useGeminiFeedback } from '../hooks/useGeminiFeedback';
import { FeedbackCard } from '../components/FeedbackCard';
import { TranscriptPanel } from '../components/TranscriptPanel';
import type { FeedbackReport, SessionData, TranscriptEntry } from '../types';

// ── Dummy data ─────────────────────────────────────────────────────────────────

const DUMMY_FEEDBACK: FeedbackReport = {
  overallScore: 8,
  strengths: [
    'Clear and structured responses throughout the interview',
    'Strong use of concrete examples from past experience',
    'Confident communication style with good pacing',
  ],
  improvements: [
    'Could provide more quantitative impact metrics in portfolio examples',
    'Consider using the STAR method more consistently for behavioral questions',
  ],
  summary:
    'Strong overall performance with clear communication and relevant examples. Focus on quantifying your design impact to make responses more compelling to hiring teams.',
};

function t(offsetSeconds: number): number {
  return Date.now() - (420 - offsetSeconds) * 1000;
}

const DUMMY_TRANSCRIPT: TranscriptEntry[] = [
  {
    role: 'model',
    text: "Hi! I'm Sarah Johnson from the design team. Great to meet you today. To kick things off — could you walk me through a project you're most proud of?",
    timestamp: t(0),
  },
  {
    role: 'user',
    text: "Thanks for having me! The project I'm most proud of is a checkout redesign I led at my previous company. We were seeing a 34% cart abandonment rate and I drove an end-to-end redesign that reduced it to 19% over three months.",
    timestamp: t(45),
  },
  {
    role: 'model',
    text: "That's a meaningful impact. What was the biggest design challenge you faced during that project, and how did you navigate it?",
    timestamp: t(85),
  },
  {
    role: 'user',
    text: "The hardest part was aligning stakeholders. Engineering wanted to minimize scope, marketing wanted to add upsells, and legal had compliance constraints. I ran a design sprint with all three teams to surface priorities, then built a phased roadmap so everyone felt heard without blocking the launch.",
    timestamp: t(130),
  },
  {
    role: 'model',
    text: "Really interesting. How did you approach the user research phase — what methods did you use and why?",
    timestamp: t(175),
  },
  {
    role: 'user',
    text: "We ran moderated usability sessions with 12 participants across different devices, and combined that with a survey to quantify pain points at scale. I also did a competitive audit of five checkout flows to spot patterns we could learn from.",
    timestamp: t(220),
  },
  {
    role: 'model',
    text: "Thorough approach. One more — what would you do differently if you were starting this project over from scratch?",
    timestamp: t(265),
  },
  {
    role: 'user',
    text: "Honestly, I'd involve engineering earlier in the design process — even in the research phase. A few of our preferred design directions turned out to be technically expensive, which caused some rework late in the cycle. Closer collaboration upfront would have saved us about two sprints.",
    timestamp: t(315),
  },
  {
    role: 'model',
    text: "That's a mature and practical reflection. Thank you — you've clearly thought deeply about both the craft and the process. We'll be in touch shortly.",
    timestamp: t(365),
  },
];

// ── Component ──────────────────────────────────────────────────────────────────

const DUMMY_FEEDBACK_REPORT: FeedbackReport = DUMMY_FEEDBACK;

interface Props {
  sessionData: SessionData;
  onReset: () => void;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function RecapScreen({ sessionData, onReset }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'feedback' | 'transcript'>('feedback');

  const { generate, feedback, loading, error } = useGeminiFeedback();

  useEffect(() => {
    const url = URL.createObjectURL(sessionData.recordingBlob);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [sessionData.recordingBlob]);

  useEffect(() => {
    generate(DUMMY_TRANSCRIPT, sessionData.config);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Always show something — real feedback if available, dummy on error, dummy while loading for demo
  const displayFeedback: FeedbackReport = feedback ?? (error ? DUMMY_FEEDBACK_REPORT : DUMMY_FEEDBACK_REPORT);

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">

      {/* Video playback */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="flex-1 bg-black flex items-center justify-center relative min-h-0">
          {videoUrl ? (
            <video ref={videoRef} src={videoUrl} controls className="w-full h-full object-contain" />
          ) : (
            <div className="text-gray-600">No recording available</div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-900 border-t border-gray-800 flex items-center justify-between shrink-0">
          <div>
            <p className="text-sm font-medium">Interview Recording</p>
            <p className="text-xs text-gray-500">Duration: {formatDuration(sessionData.durationMs)}</p>
          </div>
          <button
            onClick={onReset}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
          >
            New Interview
          </button>
        </div>
      </div>

      {/* Feedback / transcript panel */}
      <div className="w-96 flex flex-col border-l border-gray-800 overflow-hidden shrink-0">
        <div className="flex border-b border-gray-800 shrink-0">
          {(['feedback', 'transcript'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-white border-b-2 border-indigo-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {activeTab === 'feedback' ? (
            <div className="p-5">
              {loading && !displayFeedback && (
                <div className="flex items-center justify-center gap-2 text-gray-500 py-12">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Generating feedback...</span>
                </div>
              )}
              {error && (
                <div className="mb-4 text-xs text-amber-400 bg-amber-900/20 border border-amber-700/30 rounded-xl px-4 py-2.5">
                  API unavailable — showing sample feedback
                </div>
              )}
              {/* Always render FeedbackCard; key forces remount (and re-animation) if feedback changes */}
              <FeedbackCard key={feedback ? 'real' : 'dummy'} feedback={displayFeedback} />
            </div>
          ) : (
            <TranscriptPanel entries={DUMMY_TRANSCRIPT} />
          )}
        </div>
      </div>
    </div>
  );
}
