
'use server';

import { characterMatch, type CharacterMatchInput, type CharacterMatchOutput } from '@/ai/flows/character-match';

function calculateAge(dateString: string): number {
  // We expect dateString to be in DD-MM-YYYY format.
  const parts = dateString.split('-');
  if (parts.length !== 3) return 0;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JS Date
  const year = parseInt(parts[2], 10);
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return 0;
  
  const birthDate = new Date(year, month, day);
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}


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

    const age = calculateAge(data.date);
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
