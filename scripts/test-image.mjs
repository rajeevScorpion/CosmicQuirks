import OpenAI from 'openai';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const model = process.env.OPENROUTER_IMAGE_MODEL || 'black-forest-labs/flux-1-schnell';
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL,
});

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('Missing OPENROUTER_API_KEY');
    process.exit(1);
  }
  try {
    const prompt = 'Cartoon caricature bust portrait, vibrant colors, thick outlines, no text: whimsical time-traveling jester historian holding a map.';
    const res = await openrouter.images.generate({ model, prompt, size: '512x512', response_format: 'b64_json' });
    const b64 = res.data?.[0]?.b64_json || '';
    console.log(JSON.stringify({ ok: !!b64, length: b64.length, model }));
  } catch (e) {
    console.error('Image API error:', e?.message || e);
    process.exit(2);
  }
}

main();

