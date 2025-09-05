
'use server';

import type { CharacterMatchOutput } from '@/ai/flows/character-match';

export async function getPrediction(data: { 
  name: string; 
  month: string; 
  year: string; 
  question: string;
  formType?: string;
}): Promise<{data: CharacterMatchOutput | null; error: string | null; code?: string}> {
  if (!data.name || !data.month || !data.year || !data.question) {
    return { 
      data: null, 
      error: 'Please provide a valid name, birth month, birth year, and question.' 
    };
  }

  try {
    // Call our new API endpoint
    const baseURL = process.env.NODE_ENV === 'production' 
      ? process.env.NEXTAUTH_URL || 'https://cosmicquirks.in'
      : 'http://localhost:9002';
    
    const response = await fetch(`${baseURL}/api/prediction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.name,
        month: data.month,
        year: data.year,
        question: data.question,
        formType: data.formType || 'fortune',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: result.message || 'An unexpected cosmic disturbance occurred.',
        code: result.code,
      };
    }

    return {
      data: result.data,
      error: null,
    };
  } catch (e) {
    console.error('Prediction failed:', e);
    return { 
      data: null, 
      error: 'An unexpected cosmic disturbance occurred. Please try again later.' 
    };
  }
}
