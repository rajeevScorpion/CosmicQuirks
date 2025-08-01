'use server';
/**
 * @fileOverview Generates a funny future prediction inspired by a matched historical character.
 *
 * - generatePrediction - A function that generates a prediction based on the user's question and historical character.
 * - PredictionInput - The input type for the generatePrediction function.
 * - PredictionOutput - The return type for the generatePrediction function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictionInputSchema = z.object({
  question: z.string().describe('The user question about their future.'),
  character: z.string().describe('The name of the matched historical character.'),
});
export type PredictionInput = z.infer<typeof PredictionInputSchema>;

const PredictionOutputSchema = z.object({
  prediction: z.string().describe('A funny prediction inspired by the historical character.'),
});
export type PredictionOutput = z.infer<typeof PredictionOutputSchema>;

export async function generatePrediction(input: PredictionInput): Promise<PredictionOutput> {
  return generatePredictionFlow(input);
}

const predictionPrompt = ai.definePrompt({
  name: 'predictionPrompt',
  input: {schema: PredictionInputSchema},
  output: {schema: PredictionOutputSchema},
  prompt: `You are a fortune teller who specializes in funny predictions. You will make a prediction based on a question from the user, with the style of {{character}}.

Question: {{{question}}}

Prediction:`,
});

const generatePredictionFlow = ai.defineFlow(
  {
    name: 'generatePredictionFlow',
    inputSchema: PredictionInputSchema,
    outputSchema: PredictionOutputSchema,
  },
  async input => {
    const {output} = await predictionPrompt(input);
    return output!;
  }
);
