
'use server';

import type { CharacterMatchOutput } from '@/ai/flows/character-match';
import { cookies } from 'next/headers';

export async function getPrediction(data: { 
  name: string; 
  month: string; 
  year: string; 
  question: string;
}): Promise<{data: CharacterMatchOutput | null; error: string | null; code?: string}> {
  if (!data.name || !data.month || !data.year || !data.question) {
    return { 
      data: null, 
      error: 'Please provide a valid name, birth month, birth year, and question.' 
    };
  }

  try {
    // Get cookies to forward authentication
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll()
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');

    // Call our new API endpoint
    const baseURL = process.env.NODE_ENV === 'production' 
      ? process.env.NEXTAUTH_URL || 'https://cosmicquirks.in'
      : `http://localhost:${process.env.DEV_PORT || '3000'}`;
    
    const response = await fetch(`${baseURL}/api/prediction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader, // Forward authentication cookies
      },
      body: JSON.stringify({
        name: data.name,
        month: data.month,
        year: data.year,
        question: data.question,
        formType: 'fortune',
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
