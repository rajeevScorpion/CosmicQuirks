import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Since we're testing server-side code, we need to mock the environment
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function testCharacterGeneration() {
  try {
    // Dynamic import since this is a server-side module
    const { characterMatch } = await import('../src/ai/flows/character-match.js');
    
    console.log('Testing character generation...');
    
    const testInput = {
      name: 'John',
      birthdate: '01-05-1990', // May 1990
      question: 'Will I find love this year?'
    };
    
    console.log('Input:', testInput);
    
    const result = await characterMatch(testInput);
    
    console.log('\n✅ Character Generation Results:');
    console.log('Character Name:', result.characterName);
    console.log('Character Description:', result.characterDescription);
    console.log('Prediction:', result.prediction);
    
    // Check if name is different from input
    if (result.characterName.toLowerCase() !== testInput.name.toLowerCase()) {
      console.log('✅ Character name is different from user name');
    } else {
      console.log('❌ Character name is the same as user name');
    }
    
    // Check if birth month/year is mentioned
    if (result.characterDescription.includes('1990') || result.characterDescription.includes('May')) {
      console.log('✅ Birth date mentioned in description');
    } else {
      console.log('❌ Birth date NOT mentioned in description');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCharacterGeneration();