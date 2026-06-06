import { useState, useEffect, useRef } from 'react';

interface Props {
  text: string;
  /** chars revealed per tick (default 4) */
  chunkSize?: number;
  /** ms between ticks (default 18) */
  speed?: number;
  className?: string;
  onDone?: () => void;
}

/**
 * Reveals `text` gradually, character-chunk by character-chunk, mimicking
 * LLM streaming. Shows a blinking cursor until complete.
 */
export function StreamedText({ text, chunkSize = 4, speed = 18, className, onDone }: Props) {
  const [pos, setPos] = useState(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    setPos(0);
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i = Math.min(i + chunkSize, text.length);
      setPos(i);
      if (i >= text.length) {
        clearInterval(id);
        onDoneRef.current?.();
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, chunkSize, speed]);

  const done = pos >= text.length;

  return (
    <span className={className}>
      {text.slice(0, pos)}
      {!done && (
        <span
          className="inline-block w-[2px] bg-current opacity-70 align-middle ml-0.5 animate-pulse"
          style={{ height: '1em', verticalAlign: 'text-bottom' }}
        />
      )}
    </span>
  );
}
