import OpenAI from 'openai';

// Singleton OpenRouter client used by server-side flows.
export const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL,
});

export function assertOpenRouterKey() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('Missing OPENROUTER_API_KEY. Add it to .env.local');
  }
}

// OpenRouter-specific image generation using chat/completions endpoint
export async function generateImageViaChat(prompt: string): Promise<string> {
  assertOpenRouterKey();
  
  const response = await openrouter.chat.completions.create({
    model: process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image-preview',
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    // @ts-expect-error - OpenRouter extension to OpenAI API
    modalities: ['image', 'text']
  });

  // Extract base64 image from response
  const message = response.choices[0]?.message;
  // @ts-expect-error - OpenRouter extension to OpenAI API  
  const images = message?.images || [];
  
  if (images.length > 0) {
    const imageData = images[0];
    // OpenRouter returns objects with image_url.url containing the data URI
    if (typeof imageData === 'object' && imageData.image_url?.url) {
      return imageData.image_url.url;
    }
    // Fallback for direct string format
    if (typeof imageData === 'string') {
      return imageData;
    }
  }
  
  return ''; // Empty if no image generated
}
