import { useState, useEffect, useRef } from 'react';
import { StreamedText } from './StreamedText';
import type { FeedbackReport } from '../types';

interface Props {
  feedback: FeedbackReport;
}

export function FeedbackCard({ feedback }: Props) {
  const score100 = feedback.overallScore * 10;

  // Phase 1: score counts up
  const [displayScore, setDisplayScore] = useState(0);
  // Phase 2: summary streams (enabled after score done)
  const [showSummary, setShowSummary] = useState(false);
  // Phase 3: list items reveal after summary done
  const [visibleStrengths, setVisibleStrengths] = useState(0);
  const [visibleImprovements, setVisibleImprovements] = useState(0);

  const itemTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Score count-up on mount
  useEffect(() => {
    let n = 0;
    const step = Math.max(1, Math.ceil(score100 / 28));
    const id = setInterval(() => {
      n = Math.min(n + step, score100);
      setDisplayScore(n);
      if (n >= score100) {
        clearInterval(id);
        setTimeout(() => setShowSummary(true), 150);
      }
    }, 35);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After summary finishes streaming, reveal list items
  const handleSummaryDone = () => {
    const strengths = feedback.strengths.length;
    const improvements = feedback.improvements.length;
    const total = strengths + improvements;
    let count = 0;
    itemTimerRef.current = setInterval(() => {
      count++;
      if (count <= strengths) setVisibleStrengths(count);
      else setVisibleImprovements(count - strengths);
      if (count >= total) { clearInterval(itemTimerRef.current!); itemTimerRef.current = null; }
    }, 240);
  };

  useEffect(() => () => { if (itemTimerRef.current) clearInterval(itemTimerRef.current); }, []);

  const pct = Math.round((displayScore / 100) * 100);

  return (
    <div className="space-y-4">
      {/* Score banner */}
      <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' }}>
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 opacity-90" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a1 1 0 01.894.553l2.382 4.826 5.327.774a1 1 0 01.554 1.706l-3.855 3.757.91 5.306a1 1 0 01-1.451 1.054L12 17.627l-4.761 2.503a1 1 0 01-1.451-1.054l.91-5.306L2.843 9.86a1 1 0 01.554-1.706l5.327-.774L11.106 2.553A1 1 0 0112 2z" />
          </svg>
          <div>
            <p className="font-semibold text-sm">Overall Performance</p>
            <p className="text-xs opacity-70">
              Based on {feedback.strengths.length + feedback.improvements.length} observations
            </p>
          </div>
        </div>
        <p className="text-4xl font-bold mb-3 tabular-nums">
          {displayScore}<span className="text-xl opacity-60">/100</span>
        </p>
        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-[1200ms] ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Summary */}
      {showSummary && feedback.summary && (
        <p className="text-sm text-gray-400 leading-relaxed px-1 anim-slide-up-fade">
          <StreamedText text={feedback.summary} onDone={handleSummaryDone} />
        </p>
      )}

      {/* Strengths */}
      {visibleStrengths > 0 && (
        <div className="bg-green-950/40 border border-green-800/40 rounded-2xl p-5 anim-slide-up-fade">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <h3 className="font-semibold text-green-400">Strengths</h3>
          </div>
          <ul className="space-y-2.5">
            {feedback.strengths.slice(0, visibleStrengths).map((s, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-green-100/80 anim-slide-up-fade">
                <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Areas to improve */}
      {visibleImprovements > 0 && (
        <div className="bg-orange-950/30 border border-orange-800/40 rounded-2xl p-5 anim-slide-up-fade">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" d="M12 8v4M12 16h.01" />
            </svg>
            <h3 className="font-semibold text-orange-400">Areas for Improvement</h3>
          </div>
          <ul className="space-y-2.5">
            {feedback.improvements.slice(0, visibleImprovements).map((s, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-orange-100/80 anim-slide-up-fade">
                <span className="text-orange-400 mt-0.5 shrink-0">›</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
