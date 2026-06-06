export type AppScreen = 'setup' | 'interview' | 'recap';

export interface InterviewConfig {
  strategy: string;
  practiceQuestions: string[];
}

export interface TranscriptEntry {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface SessionData {
  config: InterviewConfig;
  transcript: TranscriptEntry[];
  recordingBlob: Blob;
  durationMs: number;
}

export interface FeedbackReport {
  overallScore: number;
  strengths: string[];
  improvements: string[];
  summary: string;
}
