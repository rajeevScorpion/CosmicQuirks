
// This is an AI-powered function that matches a user's birthdate with a funny, imaginary historical character.

'use server';

import { z } from 'zod';
import { Buffer } from 'node:buffer';
import { openrouter, assertOpenRouterKey, generateImageViaChat } from '@/ai/openrouter';

function svgPlaceholder(title: string, subtitle: string) {
  const safeTitle = (title || 'Cosmic Character').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeSub = (subtitle || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#9F50C9"/>
        <stop offset="100%" stop-color="#E639C3"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="256" cy="256" r="180" fill="rgba(255,255,255,0.15)" />
    <text x="50%" y="48%" text-anchor="middle" font-family="'Space Grotesk',sans-serif" font-size="28" fill="#fff">${safeTitle}</text>
    <text x="50%" y="58%" text-anchor="middle" font-family="'Space Grotesk',sans-serif" font-size="16" fill="#fff" opacity="0.9">${safeSub}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

const CharacterMatchInputSchema = z.object({
  name: z.string(),
  birthdate: z.string(),
  question: z.string(),
});
export type CharacterMatchInput = z.infer<typeof CharacterMatchInputSchema>;

const CharacterMatchOutputSchema = z.object({
  characterName: z.string(),
  characterDescription: z.string(),
  prediction: z.string(),
  characterImage: z.string(), // data URI
});
export type CharacterMatchOutput = z.infer<typeof CharacterMatchOutputSchema>;

export async function characterMatch(input: CharacterMatchInput): Promise<CharacterMatchOutput> {
  assertOpenRouterKey();

  // Ask for a compact JSON response we can parse safely.
  const system =
    'You are a playful fortune teller. Return ONLY compact JSON with keys: characterName, characterDescription, prediction.';
  const user =
    `Create a funny imaginary historical character (birthday-aligned) and a prediction.\n` +
    `Name: ${input.name}\nBirthdate: ${input.birthdate}\nQuestion: ${input.question}`;

  const completion = await openrouter.chat.completions.create({
    model: process.env.OPENROUTER_TEXT_MODEL || 'openai/gpt-4o-mini',
    temperature: 0.8,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content:
          user +
          '\nRespond ONLY valid JSON with keys: characterName, characterDescription, prediction.',
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  let parsed = {} as Omit<CharacterMatchOutput, 'characterImage'>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Fallback: try to extract JSON block if the model added prose
    const match = raw.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : ({} as any);
  }

  const safe = CharacterMatchOutputSchema.pick({
    characterName: true,
    characterDescription: true,
    prediction: true,
  }).safeParse(parsed);

  if (!safe.success) {
    throw new Error('Failed to parse character match response');
  }

  // Generate a cartoonish image using OpenRouter's chat/completions endpoint
  let dataUri = '';
  try {
    const prompt = [
      'Generate a cartoon illustration of a funny historical character.',
      'Style: playful caricature with thick outlines, flat shading, vibrant colors.',
      'Show a single front-facing bust portrait.',
      'No text, letters, watermarks, or captions in the image.',
      `Character: ${safe.data.characterName}`,
      `Description: ${safe.data.characterDescription}`,
      `Theme: ${safe.data.prediction}`,
      'Include expression and props that reflect the prediction theme.',
    ].join(' ');

    // Use OpenRouter's chat-based image generation
    dataUri = await generateImageViaChat(prompt);
    
    // If dataUri is empty or doesn't start with data:, it failed
    if (!dataUri || !dataUri.startsWith('data:')) {
      dataUri = '';
    }
  } catch (err) {
    console.error('Image generation failed:', err);
    dataUri = '';
  }

  if (!dataUri) {
    dataUri = svgPlaceholder(safe.data.characterName, 'Cosmic Quirks');
  }

  return {
    ...safe.data,
    characterImage: dataUri,
  };
}
