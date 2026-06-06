import { GoogleGenAI } from '@google/genai';

export const genaiClient = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY as string,
});
