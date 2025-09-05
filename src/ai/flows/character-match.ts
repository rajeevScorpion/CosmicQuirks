
// This is an AI-powered function that matches a user's birthdate with a funny, imaginary historical character.

'use server';

import { z } from 'zod';
import { Buffer } from 'node:buffer';
import { openai, assertOpenAIKey } from '@/ai/openai';

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
  assertOpenAIKey();

  // Ask for a compact JSON response we can parse safely.
  const system =
    'You are a playful fortune teller. Return ONLY compact JSON with keys: characterName, characterDescription, prediction.';
  const user =
    `Create a funny imaginary historical character (birthday-aligned) and a prediction.\n` +
    `Name: ${input.name}\nBirthdate: ${input.birthdate}\nQuestion: ${input.question}`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
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

  // Generate a cartoonish image as a data URI with graceful fallbacks
  let dataUri = '';
  try {
    const prompt = [
      'Generate a funny historical character matching the prediction.',
      'Create a single, front-facing, bust portrait cartoon illustration.',
      'Style: playful, caricature, thick outlines, flat shading, vibrant colors.',
      'No text, no letters, no watermark, no captions.',
      `Character: ${safe.data.characterName}.`,
      `Bio: ${safe.data.characterDescription}.`,
      `Prediction: ${safe.data.prediction}.`,
      'Show expression and props that reflect the prediction theme.',
    ].join(' ');

    const image = await openai.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3',
      prompt,
      size: '1024x1024',
      response_format: 'b64_json',
      // style: 'vivid', // uncomment if your endpoint supports style
      // quality: 'high', // uncomment if supported
      n: 1,
    });
    let b64 = image.data?.[0]?.b64_json ?? '';

    // Fallback attempt with smaller size if empty
    if (!b64) {
      const retry = await openai.images.generate({
        model: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3',
        prompt,
        size: '1024x1024',
        response_format: 'b64_json',
        n: 1,
      });
      b64 = retry.data?.[0]?.b64_json ?? '';
    }

    dataUri = b64 ? `data:image/png;base64,${b64}` : '';
  } catch (err) {
    console.error('Image generation failed:', err);
  }

  if (!dataUri) {
    dataUri = svgPlaceholder(safe.data.characterName, 'Cosmic Quirks');
  }

  return {
    ...safe.data,
    characterImage: dataUri,
  };
}
