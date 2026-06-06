import { useState, useRef, useEffect, useCallback } from 'react';
import { StreamedText } from '../components/StreamedText';
import type { InterviewConfig } from '../types';

const AI_INTRO =
  "Hello! I'm your AI interview coach. Please share the job description and the role you're applying for, and I'll help you prepare for the interview.";

const AI_RESPONSE =
  "Great! I've analyzed the job description. This looks like a collaborative, people-first culture looking for a designer who can balance autonomy with cross-functional partnership. I've built your personalized strategy on the right — select a question to kick off your mock interview.";

const SKILLS = [
  'Design Systems', 'User Research', 'Cross-functional Collaboration',
  'Product Thinking', 'Communication', 'Interaction Design',
];

const PRACTICE_QUESTIONS = [
  "Walk me through a project you're most proud of.",
  "How do you approach designing for accessibility?",
  "Tell me about a time you disagreed with a PM.",
  "Why are you interested in this particular role?",
  "How do you handle critical feedback on your designs?",
  "Describe your approach to conducting user research.",
];

// Ordered list of strategy cards — each mounts when its turn comes,
// then streams its own content via StreamedText.
const STRATEGY_CARD_DEFS = [
  {
    id: 'overview',
    icon: '◈', iconClass: 'text-blue-500',
    title: 'Role Overview',
    text: 'This role requires a blend of creative expertise and collaborative leadership. The position focuses on driving product innovation, partnering closely with engineering and product managers, and delivering user-centered solutions in a fast-paced environment.',
  },
  {
    id: 'approach',
    icon: '▣', iconClass: 'text-purple-500',
    title: 'Interview Approach',
    text: 'Focus on demonstrating your ability to lead design initiatives while staying grounded in user needs. Use the STAR method for behavioral questions and prepare specific portfolio examples that show measurable impact on users and the business.',
  },
] as const;

// ── message type ──────────────────────────────────────────────────────────────

let msgIdCounter = 0;
interface Message {
  id: number;
  role: 'ai' | 'user';
  text: string;
  stream: boolean; // whether to animate this message's text
}

function makeMsg(role: Message['role'], text: string, stream: boolean): Message {
  return { id: msgIdCounter++, role, text, stream };
}

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
  onStart: (config: InterviewConfig) => void;
}

export function SetupScreen({ onBack, onStart }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    makeMsg('ai', AI_INTRO, true),
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);

  // Strategy reveal: 0 = hidden, increments to reveal each card + skills + questions
  const [visibleCardCount, setVisibleCardCount] = useState(0);
  const [visibleSkillCount, setVisibleSkillCount] = useState(0);
  const [visibleQuestionCount, setVisibleQuestionCount] = useState(0);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const cardTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const strategyComplete = visibleQuestionCount >= PRACTICE_QUESTIONS.length;
  const canStart = !!selectedQuestion && strategyComplete;

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  useEffect(() => () => { if (cardTimerRef.current) clearInterval(cardTimerRef.current); }, []);

  // Cascade: text cards → skills → practice questions
  const startStrategyReveal = useCallback(() => {
    // Phase 1: text cards, one every 900ms (enough time to stream ~200 chars each)
    let cardCount = 0;
    const textCardTotal = STRATEGY_CARD_DEFS.length;
    const cardInterval = setInterval(() => {
      cardCount++;
      setVisibleCardCount(cardCount);
      if (cardCount >= textCardTotal) {
        clearInterval(cardInterval);
        // Phase 2: skills pills, one every 90ms
        let skillCount = 0;
        const skillInterval = setInterval(() => {
          skillCount++;
          setVisibleSkillCount(skillCount);
          if (skillCount >= SKILLS.length) {
            clearInterval(skillInterval);
            // Phase 3: practice questions, one every 120ms
            let qCount = 0;
            const qInterval = setInterval(() => {
              qCount++;
              setVisibleQuestionCount(qCount);
              if (qCount >= PRACTICE_QUESTIONS.length) clearInterval(qInterval);
            }, 120);
          }
        }, 90);
      }
    }, 950);
    cardTimerRef.current = cardInterval;
  }, []);

  const handleSend = () => {
    const text = input.trim();
    if (!text || thinking) return;
    setMessages((prev) => [...prev, makeMsg('user', text, false)]);
    setInput('');
    setThinking(true);

    setTimeout(() => {
      setMessages((prev) => [...prev, makeMsg('ai', AI_RESPONSE, true)]);
      setThinking(false);
      setTimeout(startStrategyReveal, 400);
    }, 1800);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleStart = () => {
    if (!selectedQuestion) return;
    onStart({
      strategy: 'Senior product design role at a fast-paced startup. Focus on design process, cross-functional collaboration, and delivering measurable impact.',
      practiceQuestions: [selectedQuestion],
    });
  };

  return (
    <div className="flex h-screen bg-white text-gray-900 overflow-hidden">

      {/* ── Left: chat ── */}
      <div className="flex flex-col flex-1 border-r border-gray-200 min-w-0 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 shrink-0">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-3"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to home
          </button>
          <h1 className="text-lg font-bold">Job Description Input</h1>
          <p className="text-sm text-gray-500 mt-0.5">Share the job posting or role details</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}>
                {msg.stream
                  ? <StreamedText text={msg.text} />
                  : msg.text}
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3.5 flex items-center gap-1.5">
                {[0, 150, 300].map((delay) => (
                  <span key={delay} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <div className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-blue-400 transition-colors">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste the job description here..."
              rows={1}
              disabled={thinking || strategyComplete}
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none leading-relaxed disabled:opacity-50"
              style={{ minHeight: '1.5rem', maxHeight: '7rem' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || thinking || strategyComplete}
              className="w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-full flex items-center justify-center text-white shrink-0 transition-colors"
              aria-label="Send"
            >
              <svg className="w-4 h-4 translate-x-px" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3.105 3.105a1 1 0 011.285-.078l12 8a1 1 0 010 1.646l-12 8A1 1 0 013 20V4a1 1 0 01.105-.895z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Right: strategy ── */}
      <div className="flex flex-col w-[460px] shrink-0 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold">Interview Strategy</h2>
          <p className="text-sm text-gray-500 mt-0.5">Your personalized preparation guide</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {/* Empty state */}
          {visibleCardCount === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center pb-12">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">Your strategy will appear here</p>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px]">Share the job description on the left to get started</p>
            </div>
          )}

          {visibleCardCount > 0 && (
            <div className="space-y-4">
              {/* Text strategy cards — mount one by one */}
              {STRATEGY_CARD_DEFS.map((card, i) =>
                visibleCardCount > i ? (
                  <div key={card.id} className="border border-gray-200 rounded-2xl p-5 anim-slide-up-fade">
                    <div className="flex items-center gap-2.5 mb-3">
                      <span className={`${card.iconClass} text-xl leading-none`}>{card.icon}</span>
                      <h3 className="font-semibold text-gray-900">{card.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      <StreamedText text={card.text} />
                    </p>
                  </div>
                ) : null
              )}

              {/* Key Skills card — appears after all text cards */}
              {visibleCardCount >= STRATEGY_CARD_DEFS.length && (
                <div className="border border-gray-200 rounded-2xl p-5 anim-slide-up-fade">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="text-green-500 text-xl leading-none">◎</span>
                    <h3 className="font-semibold text-gray-900">Key Skills to Highlight</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SKILLS.map((skill, i) =>
                      visibleSkillCount > i ? (
                        <span
                          key={skill}
                          className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-sm anim-slide-up-fade"
                        >
                          {skill}
                        </span>
                      ) : null
                    )}
                  </div>
                </div>
              )}

              {/* Practice Questions card — appears after skills */}
              {visibleSkillCount >= SKILLS.length && (
                <div className="border border-gray-200 rounded-2xl p-5 anim-slide-up-fade">
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="text-orange-500 text-xl leading-none">◷</span>
                    <h3 className="font-semibold text-gray-900">Practice Questions</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-4 ml-8">Select a question to focus your mock interview on</p>
                  <div className="space-y-2">
                    {PRACTICE_QUESTIONS.map((q, i) =>
                      visibleQuestionCount > i ? (
                        <button
                          key={q}
                          onClick={() => setSelectedQuestion(q)}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all border anim-slide-up-fade ${
                            selectedQuestion === q
                              ? 'bg-blue-50 border-blue-400 text-blue-900 font-medium'
                              : 'border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                          }`}
                        >
                          <span className={`inline-block w-4 mr-2 text-center ${selectedQuestion === q ? 'text-blue-500' : 'text-transparent'}`}>✓</span>
                          {q}
                        </button>
                      ) : null
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
            {canStart
              ? 'Start Mock Interview'
              : visibleCardCount > 0
              ? 'Select a question to begin'
              : 'Generating strategy…'}
          </button>
        </div>
      </div>
    </div>
  );
}
