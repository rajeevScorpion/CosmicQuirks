
'use server';

import { characterMatch, type CharacterMatchInput, type CharacterMatchOutput } from '@/ai/flows/character-match';

function calculateAge(year: number, month: number): number {
  const birthDate = new Date(year, month - 1, 1);
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

export async function getPrediction(data: { name: string; month: string; year: string; question: string }): Promise<{data: CharacterMatchOutput | null; error: string | null}> {
  if (!data.name || !data.month || !data.year || !data.question) {
    return { data: null, error: 'Please provide a valid name, birth month, birth year, and question.' };
  }

  try {
    // Using day 01 as a default since it's not provided by the user.
    const birthdate = `01-${data.month}-${data.year}`;

    const input: CharacterMatchInput = {
      name: data.name,
      birthdate: birthdate,
      question: data.question,
    };
    
    const result = await characterMatch(input);

    if (!result?.characterName || !result?.prediction || !result?.characterDescription || !result?.characterImage) {
      return { data: null, error: 'The oracle is silent. The generated response was incomplete. Please try again.' };
    }
    
    const age = calculateAge(parseInt(data.year, 10), parseInt(data.month, 10));
    let predictionPrefix = `Hi ${data.name}!`;

    if (age < 12) {
      predictionPrefix += " You are just born I guess. But I will still tell your future: ";
    }
    
    const finalResult = {
      ...result,
      prediction: `${predictionPrefix} ${result.prediction}`,
    };

    return { data: finalResult, error: null };
  } catch (e) {
    console.error('Prediction failed:', e);
    return { data: null, error: 'An unexpected cosmic disturbance occurred. Please try again later.' };
  }
}
