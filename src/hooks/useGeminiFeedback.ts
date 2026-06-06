import { useState, useCallback } from 'react';
import { genaiClient } from '../lib/geminiClient';
import type { TranscriptEntry, FeedbackReport, InterviewConfig } from '../types';

function buildFeedbackPrompt(transcript: TranscriptEntry[], config: InterviewConfig): string {
  const formatted = transcript
    .map((e) => `${e.role === 'model' ? 'Interviewer' : 'Candidate'}: ${e.text}`)
    .join('\n\n');

  return `You are evaluating a product design mock interview. Below is the full transcript.

Interview strategy / focus: ${config.strategy || 'general product design interview'}

Transcript:
${formatted}

Provide feedback as JSON with exactly this structure:
{
  "overallScore": <number 1-10>,
  "strengths": [<up to 3 specific strengths observed>],
  "improvements": [<up to 3 specific areas to improve>],
  "summary": "<2-3 sentence overall assessment>"
}`;
}

export function useGeminiFeedback() {
  const [feedback, setFeedback] = useState<FeedbackReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (transcript: TranscriptEntry[], config: InterviewConfig) => {
    setLoading(true);
    setError(null);
    try {
      const response = await genaiClient.models.generateContent({
        model: 'gemini-2.0-flash-lite',
        contents: [{ role: 'user', parts: [{ text: buildFeedbackPrompt(transcript, config) }] }],
        config: { responseMimeType: 'application/json' },
      });
      const text = response.text ?? '';
      const report: FeedbackReport = JSON.parse(text);
      setFeedback(report);
      return report;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate feedback';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, feedback, loading, error };
}
