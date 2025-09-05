'use server';
/**
 * @fileOverview Generates a funny future prediction inspired by a matched historical character.
 */

import { z } from 'zod';
import { openai, assertOpenAIKey } from '@/ai/openai';

const PredictionInputSchema = z.object({
  question: z.string(),
  character: z.string(),
});
export type PredictionInput = z.infer<typeof PredictionInputSchema>;

const PredictionOutputSchema = z.object({
  prediction: z.string(),
});
export type PredictionOutput = z.infer<typeof PredictionOutputSchema>;

export async function generatePrediction(input: PredictionInput): Promise<PredictionOutput> {
  assertOpenAIKey();

  const system = 'You write brief, humorous predictions. Output plain text only.';
  const user = `Question: ${input.question}\nStyle: ${input.character}`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
    temperature: 0.9,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  const prediction = (completion.choices[0]?.message?.content ?? '').trim();
  return { prediction };
}
