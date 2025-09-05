import OpenAI from 'openai';

// Singleton OpenAI client used by server-side flows.
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL, // optional override (e.g., Azure/OpenAI-compatible proxy)
});

export function assertOpenAIKey() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY. Add it to .env.local');
  }
}
