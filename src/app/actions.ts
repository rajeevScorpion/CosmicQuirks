
'use server';

import { characterMatch, type CharacterMatchInput, type CharacterMatchOutput } from '@/ai/flows/character-match';

export async function getPrediction(data: { name: string; date: string; question: string }): Promise<{data: CharacterMatchOutput | null; error: string | null}> {
  if (!data.name || !data.date || !data.question) {
    return { data: null, error: 'Please provide a valid name, date, and question.' };
  }

  try {
    const input: CharacterMatchInput = {
      name: data.name,
      birthdate: data.date,
      question: data.question,
    };
    
    const result = await characterMatch(input);

    if (!result?.characterName || !result?.prediction || !result?.characterDescription || !result?.characterImage) {
      return { data: null, error: 'The oracle is silent. The generated response was incomplete. Please try again.' };
    }

    // The prompt already includes "Hi {name}!" so we don't need to prepend it here.
    const finalResult = {
      ...result,
      prediction: result.prediction.startsWith(`Hi ${data.name}!`) 
        ? result.prediction.substring(`Hi ${data.name}!`.length).trim() 
        : result.prediction,
    };

    return { data: finalResult, error: null };
  } catch (e) {
    console.error('Prediction failed:', e);
    return { data: null, error: 'An unexpected cosmic disturbance occurred. Please try again later.' };
  }
}
