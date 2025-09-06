// Manual test script for the new prediction API
// Run with: node scripts/test-prediction-api.js

const testPayload = {
  name: 'Test User',
  month: '01',
  year: '1990',
  question: 'Will I find success in my career this year? I am really excited about the opportunities ahead.',
  formType: 'fortune'
};

async function testPredictionAPI() {
  try {
    console.log('🔮 Testing Prediction API...');
    console.log('Payload:', JSON.stringify(testPayload, null, 2));
    
    const response = await fetch('http://localhost:9002/api/prediction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    console.log('\n📊 Response Status:', response.status);
    
    if (!response.ok) {
      console.error('❌ Request failed:', response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }

    const data = await response.json();
    console.log('\n✅ Success! Response received:');
    console.log('Character Name:', data.data?.characterName);
    console.log('Character Description:', data.data?.characterDescription);
    console.log('Prediction (first 100 chars):', data.data?.prediction?.substring(0, 100) + '...');
    console.log('Image URL length:', data.data?.characterImage?.length);
    console.log('Image type:', data.data?.characterImage?.substring(0, 50) + '...');
    console.log('Metadata:', data.data?.metadata);
    
    // Check if we have optimized images
    if (data.data?.metadata?.hasOptimizedImages) {
      console.log('🖼️  Image optimization successful!');
    } else {
      console.log('⚠️  Image optimization not applied (may be SVG placeholder)');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testPredictionAPI();