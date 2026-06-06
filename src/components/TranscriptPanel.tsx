import { useEffect, useRef } from 'react';
import type { TranscriptEntry } from '../types';

interface Props {
  entries: TranscriptEntry[];
}

export function TranscriptPanel({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm italic">
        Transcript will appear here...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto h-full p-4">
      {entries.map((entry, i) => (
        <div
          key={i}
          className={`flex gap-2 ${entry.role === 'model' ? 'flex-row' : 'flex-row-reverse'}`}
        >
          <div
            className={`px-3 py-2 rounded-2xl text-sm max-w-[85%] leading-relaxed ${
              entry.role === 'model'
                ? 'bg-gray-800 text-gray-100 rounded-tl-sm'
                : 'bg-indigo-600 text-white rounded-tr-sm'
            }`}
          >
            <p className="text-xs font-semibold mb-1 opacity-60">
              {entry.role === 'model' ? 'Interviewer' : 'You'}
            </p>
            {entry.text}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
