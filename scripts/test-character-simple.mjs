import OpenAI from 'openai';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL,
});

async function testCharacterGeneration() {
  if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'your-openrouter-api-key-here') {
    console.error('❌ Please set your OpenRouter API key in .env.local');
    process.exit(1);
  }

  try {
    console.log('Testing character generation with new requirements...');
    
    const testName = 'John';
    const testBirthdate = '01-05-1990'; // May 1990
    const testQuestion = 'Will I find love this year?';
    
    // Calculate historical birth year (50-500 years ago)
    const currentYear = new Date().getFullYear();
    const userBirthdate = new Date(testBirthdate);
    const userMonth = userBirthdate.toLocaleString('default', { month: 'long' });
    const historicalYear = currentYear - Math.floor(Math.random() * 450 + 50); // 50-500 years ago
    
    const system = 'You are a playful fortune teller creating historical Indian characters. Return ONLY compact JSON with keys: characterName, characterDescription, prediction.';
    const user = 
      `Create a funny imaginary HISTORICAL INDIAN character and a prediction.\n` +
      `User Name: ${testName}\nUser Birth Month: ${userMonth}\nQuestion: ${testQuestion}\n\n` +
      `IMPORTANT REQUIREMENTS:\n` +
      `- characterName: Create a FUNNY TWISTED Indian version of "${testName}" (NOT the same name, but a humorous Indian variation)\n` +
      `- characterDescription: Historical Indian character born in ${userMonth} ${historicalYear} (${currentYear - historicalYear} years ago). MUST BE RELATED TO USER'S QUESTION: "${testQuestion}". Max 55 words. Include profession/role that connects to their question theme, visual details (clothing, accessories, expression), and one quirky habit\n` +
      `- prediction: Base prediction on their question, character personality, and Indian cultural context\n` +
      `- Make character's profession and story DIRECTLY RELEVANT to answering their question`;

    const completion = await openrouter.chat.completions.create({
      model: process.env.OPENROUTER_TEXT_MODEL || 'openai/gpt-4o-mini',
      temperature: 0.8,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user + '\nRespond ONLY valid JSON with keys: characterName, characterDescription, prediction.' },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    let result = {};
    try {
      result = JSON.parse(raw);
    } catch {
      // Fallback: try to extract JSON block if the model added prose
      const match = raw.match(/\{[\s\S]*\}/);
      result = match ? JSON.parse(match[0]) : {};
    }

    console.log('\n✅ Character Generation Results:');
    console.log('Character Name:', result.characterName);
    console.log('Character Description:', result.characterDescription);
    console.log('Prediction:', result.prediction);
    
    console.log(`\nGenerated historical year: ${historicalYear} (${currentYear - historicalYear} years ago)`);
    
    // Check requirements
    if (result.characterName && result.characterName.toLowerCase() !== testName.toLowerCase()) {
      console.log('✅ Character name is different from user name');
    } else {
      console.log('❌ Character name issue - should be different from user name');
    }
    
    if (result.characterDescription && result.characterDescription.includes(historicalYear.toString())) {
      console.log('✅ Historical birth year mentioned in description');
    } else {
      console.log('❌ Historical birth year NOT clearly mentioned in description');
    }
    
    if (result.characterDescription && result.characterDescription.includes(userMonth)) {
      console.log('✅ Birth month mentioned in description');
    } else {
      console.log('❌ Birth month NOT mentioned in description');
    }
    
    // Check for Indian context
    if (result.characterDescription && (result.characterDescription.toLowerCase().includes('indian') || 
        result.characterDescription.includes('India') || 
        result.characterDescription.includes('Mughal') || 
        result.characterDescription.includes('British Raj') || 
        result.characterDescription.includes('sultanate'))) {
      console.log('✅ Indian historical context present');
    } else {
      console.log('❌ Indian historical context missing');
    }
    
    // Check word count (should be max 55 words)
    const wordCount = result.characterDescription ? result.characterDescription.trim().split(/\s+/).length : 0;
    console.log(`📏 Description word count: ${wordCount}/55 words`);
    if (wordCount <= 55) {
      console.log('✅ Description within 55 word limit');
    } else {
      console.log('❌ Description exceeds 55 word limit');
    }
    
    // Check if description relates to the question
    const questionWords = testQuestion.toLowerCase().split(/\s+/);
    const descriptionLower = result.characterDescription ? result.characterDescription.toLowerCase() : '';
    const hasQuestionContext = questionWords.some(word => 
      word.length > 3 && (descriptionLower.includes(word) || descriptionLower.includes('love') || descriptionLower.includes('romance') || descriptionLower.includes('matchmaker'))
    );
    if (hasQuestionContext) {
      console.log('✅ Description relates to user\'s question context');
    } else {
      console.log('❌ Description does not clearly relate to question');
    }

    console.log('\n🎯 Testing complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCharacterGeneration();