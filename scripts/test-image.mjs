import OpenAI from 'openai';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const model = process.env.OPENAI_IMAGE_MODEL || 'dall-e-3';
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('Missing OPENAI_API_KEY');
    process.exit(1);
  }
  try {
    const prompt = 'Cartoon caricature bust portrait, vibrant colors, thick outlines, no text: whimsical time-traveling jester historian holding a map.';
    const res = await openai.images.generate({ model, prompt, size: '1024x1024', response_format: 'b64_json' });
    const b64 = res.data?.[0]?.b64_json || '';
    console.log(JSON.stringify({ ok: !!b64, length: b64.length, model }));
  } catch (e) {
    console.error('Image API error:', e?.message || e);
    process.exit(2);
  }
}

main();

