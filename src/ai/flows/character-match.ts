// This is an AI-powered function that matches a user's birthdate with a funny, imaginary historical character.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CharacterMatchInputSchema = z.object({
  name: z.string().describe('The user\'s name.'),
  birthdate: z.string().describe('The user\'s birthdate in ISO format (YYYY-MM-DD).'),
  question: z.string().describe('The user\'s question about the future.'),
});
export type CharacterMatchInput = z.infer<typeof CharacterMatchInputSchema>;

const CharacterMatchOutputSchema = z.object({
  characterName: z.string().describe('The name of the matched funny, imaginary historical character.'),
  characterDescription: z.string().describe('A brief description of the matched character.'),
  prediction: z.string().describe('A funny future prediction based on the user\'s question and inspired by the matched character.'),
  characterImage: z.string().describe('A data URI of a funny image of the imaginary character. The image should be in a cartoonish or caricature style.'),
});
export type CharacterMatchOutput = z.infer<typeof CharacterMatchOutputSchema>;

export async function characterMatch(input: CharacterMatchInput): Promise<CharacterMatchOutput> {
  return characterMatchFlow(input);
}

const characterMatchPrompt = ai.definePrompt({
  name: 'characterMatchPrompt',
  input: {schema: CharacterMatchInputSchema},
  output: {schema: z.object({
    characterName: CharacterMatchOutputSchema.shape.characterName,
    characterDescription: CharacterMatchOutputSchema.shape.characterDescription,
    prediction: CharacterMatchOutputSchema.shape.prediction,
  })},
  prompt: `You are a fortune teller who matches people to imaginary historical figures, and makes predictions based on the figure.

Given the following name, birthdate and question, create a funny, imaginary historical character that the user shares a birthday with, and provide a prediction for the user based on the character and the question.

Name: {{{name}}}
Birthdate: {{{birthdate}}}
Question: {{{question}}}

Character Name: (The name of the imaginary historical character)
Character Description: (A brief description of the character)
Prediction: (A funny future prediction inspired by the character and relevant to the question)

Make sure the character name and description are creative and humorous. The prediction should be related to both the character and question.
`,
});

const characterMatchFlow = ai.defineFlow(
  {
    name: 'characterMatchFlow',
    inputSchema: CharacterMatchInputSchema,
    outputSchema: CharacterMatchOutputSchema,
  },
  async input => {
    const {output} = await characterMatchPrompt(input);

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: `Generate a funny, cartoonish image of ${output!.characterName}, who is described as: ${output!.characterDescription}.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {
      ...output!,
      characterImage: media.url,
    };
  }
);
