import OpenAI from 'openai';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL,
});

async function testTextGeneration() {
  try {
    console.log('Testing text generation...');
    const completion = await openrouter.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say hello world' }],
      max_tokens: 10
    });
    
    const response = completion.choices[0]?.message?.content || '';
    console.log('✅ Text generation works:', response);
    return true;
  } catch (error) {
    console.log('❌ Text generation failed:', error.message);
    return false;
  }
}

async function testImageGeneration() {
  try {
    console.log('Testing image generation...');
    
    // Use OpenRouter's chat/completions format for image generation
    const response = await openrouter.chat.completions.create({
      model: process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image-preview',
      messages: [
        {
          role: 'user',
          content: 'Generate a simple cartoon illustration of a cute cat'
        }
      ],
      modalities: ['image', 'text']
    });

    const message = response.choices[0]?.message;
    const images = message?.images || [];
    
    if (images.length > 0) {
      const imageData = images[0];
      console.log('✅ Image generation works!');
      console.log('Image data type:', typeof imageData);
      console.log('Image data keys:', Object.keys(imageData));
      
      // Check if it's a data URL string or an object with URL
      const dataUrl = typeof imageData === 'string' ? imageData : imageData.url || imageData.data || JSON.stringify(imageData);
      console.log('Data preview:', dataUrl.toString().substring(0, 50) + '...');
      return true;
    } else {
      console.log('❌ No images in response');
      return false;
    }
  } catch (error) {
    console.log('❌ Image generation failed:', error.message);
    console.log('Error details:', error.response?.data || error.stack);
    return false;
  }
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'your-openrouter-api-key-here') {
    console.error('❌ Please set your OpenRouter API key in .env.local');
    process.exit(1);
  }
  
  const textOk = await testTextGeneration();
  const imageOk = await testImageGeneration();
  
  if (textOk && imageOk) {
    console.log('🎉 Both text and image generation working!');
  } else {
    console.log('⚠️ Some tests failed. Check your OpenRouter API key and account.');
  }
}

main();